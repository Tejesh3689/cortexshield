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

from openai import AsyncOpenAI

async def extract_triplets(text: str) -> List[Triplet]:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a cognitive triplet extractor. Extract knowledge from the user's input as discrete (subject, predicate, object) triplets.\n\nThe subject of every extracted triplet must be 'user' when the fact is about the person speaking (their preferences, possessions, relationships, attributes), even if the sentence structure implies a possessive phrase like 'my pet dog.' Represent possessive relationships as compound predicates instead of compound subjects — e.g. for 'my pet dog's name is Rex', extract subject='user', predicate='PET_DOG_NAME', object='rex' — NOT subject='user\\'s pet dog'. Only use a subject other than 'user' when the fact explicitly describes a third party or external entity, not the user themselves.\n\nExamples:\n- 'my pet dog's name is Rex' -> subject='user', predicate='PET_DOG_NAME', object='rex'\n- 'my favorite color is blue' -> subject='user', predicate='FAVORITE_COLOR', object='blue'\n- 'Apple was founded by Steve Jobs' -> subject='apple', predicate='FOUNDED_BY', object='steve jobs'"},
            {"role": "user", "content": text}
        ],
        response_format=ExtractionResponse,
    )
    
    if response.choices[0].message.parsed:
        return response.choices[0].message.parsed.triplets
    return []
