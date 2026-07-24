import os
from typing import List
from qdrant_client import AsyncQdrantClient
from cortex_schemas.models import Triplet

# In a real app we'd use a small, fast local embedding model like all-MiniLM-L6-v2
async def mock_embed(text: str) -> List[float]:
    return [0.0] * 384 

async def resolve_entities(triplets: List[Triplet]) -> List[Triplet]:
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    threshold = float(os.getenv("ENTITY_RESOLUTION_SIMILARITY_THRESHOLD", "0.87"))
    
    # In a full setup, we'd embed subjects and objects, query Qdrant, and replace string IDs
    # if similarity >= threshold. For now, we return the parsed ones as this fixes exact-string match.
    return triplets
