import os
import re

def get_poison_terms() -> list[str]:
    terms = os.getenv("POISON_INDICATOR_TERMS", "ignore previous,system rule:,exfiltrate").split(",")
    return [t.strip().lower() for t in terms if t.strip()]

def contains_poison(text: str) -> bool:
    if not isinstance(text, str):
        return False
    lower_text = text.lower()
    for term in get_poison_terms():
        if term in lower_text:
            return True
    return False

def redact_poison(text: str) -> str:
    if not isinstance(text, str):
        return text
    terms = get_poison_terms()
    redacted = text
    for term in terms:
        # Case-insensitive replacement
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        redacted = pattern.sub("[REDACTED_INJECTION_ATTEMPT]", redacted)
    return redacted
