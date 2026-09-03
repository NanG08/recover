# Recover Integration Setup

This guide covers local Docker setup and the external services used by Recover:

- Twilio Voice for outbound recovery calls
- Twilio WhatsApp Sandbox/API for payment reminders
- Razorpay Test Mode and webhooks
- Cloudflare Quick Tunnel for public HTTPS callbacks

## 1. What works today

Already available:

- `GET /health`
- `POST /demo`
- `WebSocket /ws/audit`
- `POST /twilio/voice/incoming`
- `POST /twilio/voice/transcript`
- `POST /twilio/voice/status`
- `POST /twilio/whatsapp/incoming`
- `POST /twilio/whatsapp/send`
- `POST /twilio/whatsapp/status`
- `POST /twilio/voice/start`
- PostgreSQL and Redis through Docker Compose
- Twilio Voice client in `backend/voice_service.py`
- Twilio WhatsApp send client in `backend/whatsapp_service.py`

Still required before production integrations work:

- `POST /webhooks/razorpay`
- A real payment-link/status call in place of the mocked Razorpay action

Do not configure Twilio callbacks until the corresponding FastAPI routes exist. They will otherwise return `404`.

## 2. Environment file

Keep `.env` private and never commit it. Start from `.env.example`, then use values like these:

```env
# Docker services
POSTGRES_USER=recover
POSTGRES_PASSWORD=choose-a-local-password
POSTGRES_DB=recover_db
DATABASE_URL=postgresql://recover:choose-a-local-password@postgres:5432/recover_db
REDIS_URL=redis://redis:6379/0

# Razorpay Test Mode
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=choose-a-webhook-secret

# Twilio Voice
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_rotated_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PUBLIC_BASE_URL=https://your-tunnel.trycloudflare.com
TWILIO_WHATSAPP_STATUS_URL=https://your-tunnel.trycloudflare.com/twilio/whatsapp/status
TWILIO_VALIDATE_SIGNATURE=false
```

For local Docker Compose, the backend overrides `DATABASE_URL` and `REDIS_URL` to use the service names `postgres` and `redis`. Docker PostgreSQL is exposed on host port `5433` to avoid conflicts with an existing Windows PostgreSQL service. For running the backend directly on Windows, use `127.0.0.1:5433` instead.

For the Twilio WhatsApp Sandbox, use `whatsapp:+14155238886` as the default sender and join the Sandbox from the recipient's WhatsApp account.

## 3. Start the local application

From the `recover` directory:

```powershell
docker compose up --build -d
```

Check services:

```powershell
docker compose ps
```

Check the backend:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected result:

```json
{"status":"ok"}
```

Open the frontend at `http://localhost:5173`.

To view logs:

```powershell
docker compose logs -f backend
```

## 4. Create a public HTTPS URL

Twilio cannot call `localhost`. Keep the backend running, open a second PowerShell window, and run:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Copy the generated URL, for example:

```text
https://mounted-dallas-geometry-composed.trycloudflare.com
```

Test the tunnel:

```text
https://mounted-dallas-geometry-composed.trycloudflare.com/health
```

A Quick Tunnel URL changes when `cloudflared` stops. Keep that terminal open while testing. For a stable production URL, create a named Cloudflare Tunnel.

## 5. Twilio Voice setup

### Create or find a phone number

1. Open the Twilio Console.
2. Go to **Phone Numbers**.
3. Open **Manage > Buy a number**, or use the trial number already assigned to the account.
4. Choose a number with **Voice** capability.
5. Copy it in E.164 format, such as `+14155551234`.
6. Put it in `.env` as `TWILIO_PHONE_NUMBER`.

A trial account normally requires the destination phone number to be verified. The Twilio Console's **Make & receive calls** screen can also run a direct test call without your backend.

### Find Twilio credentials

In **Twilio Console > Account Info**, copy:

- **Account SID**, beginning with `AC`
- **Auth Token**

Put them in `.env`. If an Auth Token has ever been pasted into chat, screenshots, source control, or a public issue, rotate it before using it.

### Configure callbacks

After the FastAPI routes are implemented, open:

**Phone Numbers > Manage > Active numbers > your number > Voice Configuration**

Set:

```text
A call comes in:
https://YOUR_TUNNEL_HOST/twilio/voice/incoming
Method: POST

Call status changes:
https://YOUR_TUNNEL_HOST/twilio/voice/status
Method: POST
```

Replace `YOUR_TUNNEL_HOST` with the actual Cloudflare hostname. Do not type `YOUR_TUNNEL_HOST` literally.

### Expected call flow

1. Recover requests Twilio to create an outbound call.
2. Twilio requests `/twilio/voice/incoming` for call instructions.
3. Recover returns TwiML with a greeting and speech collection.
4. Twilio posts the transcript to a speech-result route.
5. Recover's NLU maps the transcript to an intent.
6. The FSM changes state and broadcasts an audit event.
7. Twilio posts final call status to `/twilio/voice/status`.

The Twilio Calls API client is used by `VoiceService`. Set `TWILIO_PUBLIC_BASE_URL` to the current tunnel URL before starting an outbound call.

## 6. Twilio WhatsApp setup

The current code uses Twilio WhatsApp, not Meta Graph API.

### Activate the Twilio Sandbox

1. Open **Twilio Console > Messaging > Try it out > Send a WhatsApp message**.
2. Activate the WhatsApp Sandbox.
3. From the recipient's WhatsApp, send the displayed join code.
4. Use the Sandbox sender shown by Twilio as `TWILIO_WHATSAPP_FROM`.
5. Use the same Twilio Account SID and Auth Token as Voice.

### Test messaging

1. Add your personal number as a verified Sandbox recipient.
2. Send the displayed join message from WhatsApp.
3. Send a test message from the Twilio console.
4. Confirm the recipient receives it.

The code's WhatsApp client posts to:

```text
https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

For real payment reminders, use an approved WhatsApp template and send to a real customer phone number. Do not use a Razorpay payment ID as the WhatsApp recipient.

### Configure incoming replies

Configure in the Twilio WhatsApp Sandbox settings:

- Incoming message webhook: `https://YOUR_TUNNEL_HOST/twilio/whatsapp/incoming`
- Method: `POST`

For delivery status logs, also set the Sandbox **Status callback URL** to:

```text
https://YOUR_TUNNEL_HOST/twilio/whatsapp/status
```

Recover can send a test reminder with:

```powershell
Invoke-RestMethod http://localhost:8000/twilio/whatsapp/send -Method Post -ContentType 'application/json' -Body '{"to":"+919599202071","amount":49900,"customer_name":"Rahul","payment_link":"https://rzp.io/i/example"}'
```

The recipient must have joined the Sandbox. During the 24-hour customer-service window, this free-form message is allowed. Outside that window, use a Twilio-approved template.

When `TWILIO_WHATSAPP_CONTENT_SID` is set, the send endpoint uses the Content Template Builder template and sends variables as `ContentVariables`: `{{1}}` is the customer name, `{{2}}` is the formatted amount, and `{{3}}` is included only when a payment link is supplied. The template must define the same variables. If the template has no `{{3}}`, omit `payment_link` from the request.

### Conversational bot behavior

The Sandbox cannot use a custom Recover sender name or custom template. It can still run a useful bot after the recipient joins and sends a message:

1. The recipient joins the Sandbox using Twilio's join code.
2. The recipient sends `hello` to the Sandbox number.
3. Twilio posts the message to `/twilio/whatsapp/incoming`.
4. Recover replies with a payment-recovery menu.
5. The recipient replies `PAY`, `DELAY`, or `DISPUTE`.
6. Recover returns a contextual bot response.

This bot path does not create a fake payment event with amount zero. A real Razorpay recovery case should enter the FSM through `/webhook` and include the customer phone number in the case data.

For messages started by Recover outside the 24-hour window, Twilio requires an approved template. The Sandbox only provides its pre-approved templates, so the appointment template is suitable for API testing but not for a realistic payment-recovery message. A custom payment template requires a registered WhatsApp sender and template approval after the trial/Sandbox stage.

## 7. Razorpay Test Mode setup

1. Create or open a Razorpay account.
2. Switch to **Test Mode**.
3. Open **Settings > API Keys**.
4. Generate test keys.
5. Put the key ID and secret in `.env`.
6. Create a webhook secret in Razorpay.
7. Configure the webhook URL after implementing the route:

```text
https://YOUR_TUNNEL_HOST/webhooks/razorpay
```

Subscribe to the events needed by Recover, such as:

- `payment.failed`
- `invoice.overdue`
- `subscription.halted`
- `payment.captured`

The backend should verify the `x-razorpay-signature` header with `RAZORPAY_WEBHOOK_SECRET`, reject invalid signatures with `401`, deduplicate event IDs, and enqueue processing.

Razorpay Test Mode does not move real money. Live mode requires account activation and charges transaction fees.

## 8. Recommended implementation order

1. Keep PostgreSQL and Redis running through Docker.
2. Add `POST /webhooks/razorpay` and signature verification.
3. Add `GET /audit` so the frontend can load persisted history.
4. Start `cloudflared` and configure the external callback URLs.
5. Test WhatsApp replies, outbound WhatsApp, then Twilio Voice.
6. Add the Razorpay webhook and payment-link/status integration.

## 9. Security checklist

- Rotate any credential that has been exposed.
- Never commit `.env`.
- Use test keys until the complete flow is verified.
- Use HTTPS for every external webhook.
- Verify Razorpay, Twilio, and Meta webhook signatures.
- Store only the minimum customer data required.
- Keep Cloudflare Quick Tunnel sessions temporary; use a named tunnel for deployment.
- Do not put provider secrets in frontend `VITE_*` variables.

## 10. Quick troubleshooting

### `ngrok` is blocked or outdated

Use Cloudflare instead:

```powershell
cloudflared tunnel --url http://localhost:8000
```

### Twilio returns `404`

The configured callback route has not been implemented, or the URL path is incorrect.

### Twilio cannot reach the app

Confirm Docker is running, port `8000` is listening, `cloudflared` is still running, and the callback URL uses the current HTTPS hostname.

### WhatsApp sends no message

Check that the Twilio credentials are valid, the recipient joined the Sandbox, the recipient is verified for the trial account, and the message follows Twilio's template/window rules.

### Backend starts but external calls fail

Check `docker compose logs backend`, then verify that `.env` uses the exact variable names in this document. Restart the backend after changing `.env`:

```powershell
docker compose up -d --force-recreate backend
```
