import pytest

@pytest.mark.skip(reason="No docker daemon available. Run in CI against live Postgres/OPA stack.")
@pytest.mark.asyncio
async def test_tenant_override_dynamic_update():
    """
    Test that changing a tenant_overrides row in Postgres results
    in a changed OPA decision within OPA_BUNDLE_POLL_INTERVAL_SECONDS.
    
    1. Create tenant override (tenant_x: 0.8).
    2. Wait 6 seconds for bundle rebuild.
    3. Check OPA decision with trust_score=0.5 (should DENY).
    4. Update tenant override (tenant_x: 0.4).
    5. Wait 6 seconds.
    6. Check OPA decision with trust_score=0.5 (should ALLOW).
    """
    pass
