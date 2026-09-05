import os
import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Regex fallback patterns (used when Groq is unavailable)
_INTENT_PATTERNS = {
    "en": {
        r"\b(pay|send|pay now|pay via upi|yes|confirm|ok|sure)\b": "AGREE_TO_PAY",
        r"\b(can't pay|need time|delay|later|wait|tomorrow|kal)\b": "ASK_DELAY",
        r"\b(not my charge|dispute|wrong amount|fraud|mistake)\b": "DISPUTE_CHARGE",
    },
    "hi": {
        r"\b(bhej de|pay karo|pay kar do|haan|theek hai|kar dunga|dunga)\b": "AGREE_TO_PAY",
        r"\b(thoda time do|kal doonga|delay|baad mein|abhi nahi)\b": "ASK_DELAY",
        r"\b(gair sahi|dispute|galat amount|mera nahi|fraud)\b": "DISPUTE_CHARGE",
    },
    "hr": {
        r"\b(gaed de|bhej de|pay kar de|haan bhai|kar dunga)\b": "AGREE_TO_PAY",
        r"\b(kal karun|time chaiye|delay|baad mein)\b": "ASK_DELAY",
        r"\b(dispute|charge ki galti|na manni|galat)\b": "DISPUTE_CHARGE",
    },
}

_SYSTEM_PROMPT = """You are an intent classifier for a payment recovery system.
Classify the customer's message into exactly one of these intents:
- AGREE_TO_PAY: customer agrees to pay, confirms payment, says yes/ok/will pay
- ASK_DELAY: customer asks for more time, says later/tomorrow/can't pay now
- DISPUTE_CHARGE: customer disputes the charge, says it's wrong/fraud/not theirs

Respond with ONLY the intent name, nothing else. No explanation."""


class IntentRecognizer:
    def __init__(self):
        self._groq_client = None
        self.mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"

    def _get_groq(self):
        if self._groq_client is None:
            api_key = os.getenv("GROQ_API_KEY")
            if api_key:
                from groq import Groq
                self._groq_client = Groq(api_key=api_key)
        return self._groq_client

    def _regex_recognize(self, text: str, language: str) -> Tuple[str, float]:
        normalized = re.sub(r"[!?.,]", "", text.lower())
        patterns = _INTENT_PATTERNS.get(language, _INTENT_PATTERNS["en"])
        for pattern, intent in patterns.items():
            if re.search(pattern, normalized):
                return intent, 0.85
        return "DISPUTE_CHARGE", 0.4

    def recognize(self, text: str, language: str) -> Tuple[str, float]:
        if not text:
            return "DISPUTE_CHARGE", 0.1

        client = None if self.mock_mode else self._get_groq()
        if client:
            try:
                lang_hint = {"en": "English", "hi": "Hindi", "hr": "Haryanvi"}.get(language, "English")
                response = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": f"[Language: {lang_hint}] Customer said: {text}"},
                    ],
                    max_tokens=10,
                    temperature=0,
                )
                intent = response.choices[0].message.content.strip().upper()
                if intent in ("AGREE_TO_PAY", "ASK_DELAY", "DISPUTE_CHARGE"):
                    logger.info("Groq intent=%s text='%s'", intent, text)
                    return intent, 0.97
                logger.warning("Groq returned unexpected intent '%s', falling back to regex", intent)
            except Exception as exc:
                logger.warning("Groq call failed (%s), falling back to regex", exc)

        intent, confidence = self._regex_recognize(text, language)
        logger.info("Regex intent=%s confidence=%.2f text='%s'", intent, confidence, text)
        return intent, confidence
