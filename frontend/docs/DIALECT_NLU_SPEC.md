# Dialect NLU Specification

This document captures the deterministic phrase‑mapping rules used by the **IntentRecognizer** (regex‑based NLU) for the three supported language codes.

## Language Codes
- `en` – English / Hinglish (Latin script)
- `hi` – Hindi (transliterated Latin script)
- `hr` – Haryanvi (phonetic Latin script)

## Intent Types
| Intent Code | Description |
|-------------|-------------|
| `AGREE_TO_PAY` | Customer explicitly agrees to pay (or requests a payment link).
| `ASK_DELAY`    | Customer asks for more time / promises to pay later.
| `DISPUTE_CHARGE` | Customer disputes the charge or claims it is incorrect.

## Regex Pattern Matrix
The following table lists the regular‑expression patterns (case‑insensitive) that map a spoken phrase to an intent. Patterns are applied after normalising the transcript (lower‑casing and stripping punctuation).

| Language | Pattern (Python regex) | Intent |
|----------|------------------------|--------|
| **en** | `\b(pay|send|pay now|pay via upi)\b` | `AGREE_TO_PAY` |
| **en** | `\b(can't pay now|need time|delay|later)\b` | `ASK_DELAY` |
| **en** | `\b(not my charge|dispute|wrong amount)\b` | `DISPUTE_CHARGE` |
| **hi** | `\b(bhej de|pay karo|pay kar do)\b` | `AGREE_TO_PAY` |
| **hi** | `\b(thoda time do|kal doonga|delay)\b` | `ASK_DELAY` |
| **hi** | `\b(gair sahi charge|dispute|galat amount)\b` | `DISPUTE_CHARGE` |
| **hr** | `\b(gae?d de|bhej de|pay kar de)\b` | `AGREE_TO_PAY` |
| **hr** | `\b(kal karun|time chaiye|delay)\b` | `ASK_DELAY` |
| **hr** | `\b(dispute|charge ki galti|na manni)\b` | `DISPUTE_CHARGE` |

## Adding New Phrases
1. Identify the language code (`en`, `hi`, `hr`).
2. Add a new regex pattern to the `_INTENT_PATTERNS` dict in `backend/intent_nlu.py`.
3. Update this specification document accordingly.

The deterministic approach guarantees **zero‑hallucination** and sub‑millisecond classification latency.
