# @cortexshield/proxy-mcp

A thin MCP proxy client that routes your LLM agent's traffic through the CortexShield security gateway.

## Usage

Simply add this package as an MCP server in your `mcp.json` (for Claude Desktop, Cursor, or your custom agent):

```json
{
  "mcpServers": {
    "cortex-protected-tools": {
      "command": "npx",
      "args": ["-y", "@cortexshield/proxy-mcp"],
      "env": {
        "CORTEXSHIELD_GATEWAY_URL": "https://gateway.your-cortex-instance.com/jsonrpc",
        "CORTEXSHIELD_API_KEY": "sk_your_tenant_key"
      }
    }
  }
}
```

All stdio JSON-RPC tool calls will be transparently proxied to the CortexShield proxy-engine for anomaly detection, graph self-healing, and policy evaluation before executing.
