---
sidebar_position: 2
---

# Quickstart

Integrate CortexShield into your AI agent's workflow in less than 2 minutes using our official MCP SDK.

## 1. Install the SDK

Our thin proxy client routes your LLM agent's traffic through your CortexShield instance. You do not need to install it in your project; you can invoke it directly via `npx` in your agent's MCP configuration.

## 2. Configure your Agent (Cursor / Claude Desktop)

Add the following configuration to your `mcp.json` or Claude Desktop config. 

Replace the `CORTEXSHIELD_GATEWAY_URL` with your proxy-engine endpoint and inject your `CORTEXSHIELD_API_KEY`.

```json
{
  "mcpServers": {
    "cortex-protected-tools": {
      "command": "npx",
      "args": ["-y", "@cortexshield/proxy-mcp"],
      "env": {
        "CORTEXSHIELD_GATEWAY_URL": "http://localhost:8000/jsonrpc",
        "CORTEXSHIELD_API_KEY": "sk_your_tenant_key"
      }
    }
  }
}
```

## 3. That's it!

All tool calls requested by your agent (e.g. "Execute this shell command" or "Read this database row") will be transparently routed to CortexShield. 

The proxy will evaluate the call against your tenant's anomaly models and restricted-tool policies. If it passes, it executes. If it's malicious, CortexShield intercepts it and returns a blocked status back to your agent.
