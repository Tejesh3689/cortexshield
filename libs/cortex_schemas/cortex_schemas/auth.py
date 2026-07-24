from typing import List, Optional
from pydantic import BaseModel

class TenantContext(BaseModel):
    tenant_id: str
    user_id: Optional[str] = None
    tier: str
    scopes: List[str] = []
    auth_provider: str
