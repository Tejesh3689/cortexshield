import pytest
from unittest.mock import patch, AsyncMock
from cortex_proxy.ingress.jsonrpc_interceptor import process_jsonrpc
from cortex_proxy.firewall.opa_client import evaluate_policy
from cortex_schemas.models import FirewallDecisionType

@pytest.mark.asyncio
@patch("cortex_proxy.ingress.memory_ingest_fastpath.nats.connect")
async def test_add_memory_fastpath(mock_connect):
    mock_nc = AsyncMock()
    mock_js = AsyncMock()
    mock_nc.jetstream.return_value = mock_js
    mock_connect.return_value = mock_nc
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "add_memory", "arguments": {"text": "I live in SF"}},
        "id": 1
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert resp["result"]["status"] == "enqueued"
    
    # Confirm a message lands on NATS subject memory.writes.raw
    mock_js.publish.assert_called_once()
    args = mock_js.publish.call_args[0]
    assert args[0] == "memory.writes.raw"
    assert b"I live in SF" in args[1]

@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.nats.connect")
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.9)
async def test_non_restricted_tool_allow(mock_trust, mock_connect):
    mock_nc = AsyncMock()
    mock_nc.jetstream.return_value = AsyncMock()
    mock_connect.return_value = mock_nc
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "read_weather", "arguments": {}},
        "id": 2
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert resp["result"]["status"] == "allowed"

@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.nats.connect")
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.2)
@patch("cortex_proxy.firewall.action_firewall.evaluate_policy")
async def test_restricted_tool_deny(mock_eval, mock_trust, mock_connect):
    mock_nc = AsyncMock()
    mock_nc.jetstream.return_value = AsyncMock()
    mock_connect.return_value = mock_nc
    
    # Mock OPA to deny due to low trust score seeded in Redis
    mock_eval.return_value = {"allow": False, "reason": "Trust score too low for restricted tool"}
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "execute_shell_command", "arguments": {}},
        "id": 3
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert "error" in resp
    assert "Trust score too low" in resp["error"]["message"]
