import pytest
from unittest.mock import patch, AsyncMock
from cortex_proxy.ingress.jsonrpc_interceptor import process_jsonrpc
from cortex_schemas.models import FirewallDecisionType


@pytest.mark.asyncio
@patch("cortex_proxy.ingress.memory_ingest_fastpath.asyncio.create_task")
@patch("cortex_healing.processor.process_memory_write_job", new_callable=AsyncMock)
async def test_add_memory_fastpath(mock_processor, mock_create_task):
    """
    Confirms handle_add_memory dispatches a background task and returns "accepted".
    NATS mocks removed — NATS is replaced by asyncio.create_task (ADR-0013).
    """
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "add_memory", "arguments": {"text": "I live in SF"}},
        "id": 1,
    }

    resp = await process_jsonrpc(req, "tenant1", "agent1")
    # Status changed from "enqueued" to "accepted" to reflect direct in-process dispatch
    assert resp["result"]["status"] == "accepted"
    # A background task was created (not a NATS publish)
    mock_create_task.assert_called_once()


@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.9)
@patch("cortex_proxy.firewall.action_firewall.get_sequence_score", return_value=0.0)
async def test_non_restricted_tool_allow(mock_seq, mock_trust):
    """
    Non-restricted tool should be ALLOWED by the Python denylist.
    OPA and NATS mocks removed (ADR-0013).
    """
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "read_weather", "arguments": {}},
        "id": 2,
    }

    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert "error" not in resp


@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.2)
@patch("cortex_proxy.firewall.action_firewall.get_sequence_score", return_value=0.0)
async def test_restricted_tool_deny(mock_seq, mock_trust):
    """
    Tool in FIREWALL_DEFAULT_RESTRICTED_TOOLS denylist should be DENIED.
    OPA mock removed — enforcement is now the Python denylist (ADR-0013).
    """
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "exec_shell", "arguments": {}},
        "id": 3,
    }

    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert "error" in resp
    assert "restricted" in resp["error"]["message"].lower() or "Denied" in resp["error"]["message"]
