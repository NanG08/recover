# tunnel.ps1 — start tunnel and auto-update .env
# Usage: .\tunnel.ps1

$job = Start-Job {
    cloudflared tunnel --url http://localhost:8000 2>&1
}

Write-Host "Starting tunnel..." -ForegroundColor Cyan
$url = $null

# Wait for the URL to appear in output
while (-not $url) {
    Start-Sleep -Milliseconds 500
    $output = Receive-Job $job
    foreach ($line in $output) {
        if ($line -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $url = $matches[0]
        }
    }
}

Write-Host "Tunnel URL: $url" -ForegroundColor Green

# Update .env
$envPath = Join-Path $PSScriptRoot ".env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace "TWILIO_PUBLIC_BASE_URL=.*", "TWILIO_PUBLIC_BASE_URL=$url"
$envContent = $envContent -replace "TWILIO_WHATSAPP_STATUS_URL=.*", "TWILIO_WHATSAPP_STATUS_URL=$url/twilio/whatsapp/status"
Set-Content $envPath $envContent

Write-Host ".env updated" -ForegroundColor Green
Write-Host ""
Write-Host "Update these in Twilio console (Sandbox Settings):" -ForegroundColor Yellow
Write-Host "  Incoming message webhook: $url/twilio/whatsapp/incoming" -ForegroundColor White
Write-Host "  Status callback:          $url/twilio/whatsapp/status" -ForegroundColor White
Write-Host ""
Write-Host "Update this in Vapi dashboard (Settings > Server URL):" -ForegroundColor Yellow
Write-Host "  $url/vapi/webhook" -ForegroundColor White
Write-Host ""
Write-Host "Then restart uvicorn to pick up the new .env" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the tunnel"

# Keep tunnel alive
Wait-Job $job
