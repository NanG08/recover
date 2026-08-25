import re
import logging
from typing import Tuple

# Simple regex patterns for intent detection per language
_INTENT_PATTERNS = {
    # English / Hinglish
    "en": {
        r"\b(pay|send|pay now|pay via upi)\b": "AGREE_TO_PAY",
        r"\b(can't pay now|need time|delay|later)\b": "ASK_DELAY",
        r"\b(not my charge|dispute|wrong amount)\b": "DISPUTE_CHARGE",
    },
    # Hindi (transliterated Hindi words) – using common phonetic forms
    "hi": {
        r"\b(bhej de|pay karo|pay kar do)\b": "AGREE_TO_PAY",
        r"\b(thoda time do|kal doonga|delay)\b": "ASK_DELAY",
        r"\b(gair sahi charge|dispute|galat amount)\b": "DISPUTE_CHARGE",
    },
    # Haryanvi (phonetic variants)
    "hr": {
        r"\b(gae?d de|bhej de|pay kar de)\b": "AGREE_TO_PAY",
        r"\b(kal karun|time chaiye|delay)\b": "ASK_DELAY",
        r"\b(dispute|charge ki galti|na manni)\b": "DISPUTE_CHARGE",
    },
}

logger = logging.getLogger(__name__)

class IntentRecognizer:
    """Deterministic, regex‑based intent recognizer.

    If a more sophisticated model is desired, the `classify_with_model` method can be
    extended to load a pre‑trained Scikit‑learn SVM or FastText model. For the prototype
    we rely solely on the regex patterns for zero‑hallucination, sub‑second latency.
    """

    def __init__(self):
        # Placeholder for future ML model loading
        self.model = None

    def recognize(self, text: str, language: str) -> Tuple[str, float]:
        """Return (intent, confidence) for the given text.

        Args:
            text: The utterance transcript.
            language: Language code ('en', 'hi', 'hr').
        Returns:
            A tuple of intent name and confidence score (0.0‑1.0).
        """
        if not text:
            logger.debug("Empty transcript, defaulting to DISPUTE_CHARGE with low confidence")
            return "DISPUTE_CHARGE", 0.1
        # Normalise text: lower case, strip punctuation
        normalized = re.sub(r"[!?.,]", "", text.lower())
        patterns = _INTENT_PATTERNS.get(language, _INTENT_PATTERNS["en"])  # fallback to English patterns
        for pattern, intent in patterns.items():
            if re.search(pattern, normalized):
                logger.debug("Matched intent %s for text '%s' using pattern %s", intent, text, pattern)
                return intent, 0.95
        # If no pattern matched, return fallback intent with low confidence
        logger.debug("No regex match for text '%s' (lang=%s); falling back to DISPUTE_CHARGE", text, language)
        return "DISPUTE_CHARGE", 0.4

    # Future extension point – not used in the current prototype
    def classify_with_model(self, text: str, language: str) -> Tuple[str, float]:
        """Placeholder for ML model classification.
        Returns (intent, confidence). Currently raises NotImplementedError.
        """
        raise NotImplementedError("ML model classification not implemented in deterministic prototype")
