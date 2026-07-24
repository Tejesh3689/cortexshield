---
sidebar_position: 3
---

# MCP Gateway API Reference

If you are building a custom agent without our `@cortexshield/proxy-mcp` SDK, you can interface directly with the Gateway endpoint using standard JSON-RPC 2.0.

## Endpoint

`POST https://gateway.your-cortex-instance.com/jsonrpc`

**Headers Required:**
- `Content-Type: application/json`
- `X-API-Key: <your_tenant_api_key>`

---

## Request Shape (`ToolCallRequest`)

Your payload must match standard MCP/JSON-RPC structure.

```json
{
  "jsonrpc": "2.0",
  "id": "req_12345",
  "method": "execute_shell_command",
  "params": {
    "command": "cat /etc/passwd"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `jsonrpc` | string | Must be exactly `"2.0"`. |
| `id` | string \| number | Unique identifier for the request. |
| `method` | string | The name of the tool/action the agent wants to perform. |
| `params` | object | (Optional) The arguments required for the tool. |

---

## Response Shape (`ToolCallResponse`)

CortexShield returns a synchronous response indicating whether the action was executed or blocked by the firewall.

### Success (Action Allowed & Executed)
```json
{
  "jsonrpc": "2.0",
  "id": "req_12345",
  "result": {
    "stdout": "...",
    "status": "success"
  }
}
```

### Blocked (Anomaly Detected or Policy Denied)
If the trust score is too low or a Rego policy denies the action, the proxy returns a JSON-RPC error. Your agent should interpret this as a system-level rejection.

```json
{
  "jsonrpc": "2.0",
  "id": "req_12345",
  "error": {
    "code": -32001,
    "message": "CortexShield Firewall: Action blocked due to low trust score.",
    "data": {
      "trust_score": 0.12,
      "threshold": 0.30
    }
  }
}
```
