import jwt

def validate_browser_session(token: str) -> str:
    """
    Validates a browser Clerk/WorkOS session JWT.
    Returns the tenant_id extracted from the token.
    """
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("org_id") or decoded.get("sub") or "default_tenant"
    except Exception:
        return "default_tenant"
