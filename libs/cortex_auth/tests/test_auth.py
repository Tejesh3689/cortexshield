import pytest
from fastapi import Request, HTTPException
from cortex_auth.middleware import get_tenant_context
from fastapi.security import HTTPAuthorizationCredentials

class MockRequest:
    def __init__(self, headers=None, cookies=None):
        self.headers = headers or {}
        self.cookies = cookies or {}

@pytest.mark.asyncio
async def test_valid_clerk_jwt():
    req = MockRequest()
    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials="test_valid_clerk_token")
    ctx = await get_tenant_context(req, auth)
    assert ctx.tenant_id == "tenant_1"
    assert ctx.auth_provider == "clerk"
    assert ctx.tier == "pro"

@pytest.mark.asyncio
async def test_valid_workos_jwt():
    req = MockRequest()
    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials="test_valid_workos_token")
    ctx = await get_tenant_context(req, auth)
    assert ctx.tenant_id == "tenant_2"
    assert ctx.auth_provider == "workos"
    assert ctx.tier == "enterprise"

@pytest.mark.asyncio
async def test_invalid_jwt():
    req = MockRequest()
    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials="header.payload.invalid_signature")
    with pytest.raises(HTTPException) as exc:
        await get_tenant_context(req, auth)
    assert exc.value.status_code == 401

@pytest.mark.asyncio
async def test_valid_api_key():
    req = MockRequest(headers={"X-API-Key": "test_valid_api_key"})
    ctx = await get_tenant_context(req, auth=None)
    assert ctx.tenant_id == "tenant_3"
    assert ctx.auth_provider == "api_key"
    assert ctx.tier == "growth"

@pytest.mark.asyncio
async def test_invalid_api_key():
    req = MockRequest(headers={"X-API-Key": "completely_invalid_key"})
    with pytest.raises(HTTPException) as exc:
        await get_tenant_context(req, auth=None)
    assert exc.value.status_code == 401
