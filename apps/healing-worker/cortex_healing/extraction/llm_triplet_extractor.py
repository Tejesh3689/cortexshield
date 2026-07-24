import os
# Bypassing instructor/litellm for hackathon due to Python 3.14 Rust build failure
# import instructor
# from litellm import acompletion
from pydantic import BaseModel
from typing import List, Tuple
from cortex_schemas.models import Triplet, OriginSource
import sys

# Ensure libs can be imported natively in real env, here we mock it for the standalone file
try:
    from cortex_security_rules.poison import contains_poison
except ImportError:
    # Fallback for execution before package install
    def contains_poison(text): return False

class ExtractionResponse(BaseModel):
    triplets: List[Triplet]

def check_poison(raw_text: str, origin: OriginSource) -> Tuple[float, bool]:
    """Applies pre-filter for poison indicator terms using shared security rules."""
    is_poisoned = contains_poison(raw_text)
    
    if is_poisoned:
        return float(os.getenv("POISON_TRUST_SCORE", "0.05")), True
            
    if origin == OriginSource.USER_PROMPT:
        return 1.0, False
    elif origin == OriginSource.UNTRUSTED_DOC or origin == OriginSource.WEB_SCRAPE:
        return 0.2, False
    return 0.8, False

async def extract_triplets(text: str) -> List[Triplet]:
    # Mock LLM for hackathon Python 3.14 build compatibility
    return [
        Triplet(subject="user", predicate="favorite_color", object="blue")
    ]
