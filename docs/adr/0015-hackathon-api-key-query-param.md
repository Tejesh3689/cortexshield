# 15. Hackathon Query Parameter Fallbacks for Headers

Date: 2026-07-25

## Status
Accepted

## Context
We need to connect Claude Desktop to the proxy-engine via its MCP connector form. However, the current MCP connector form in Claude Desktop only accepts a URL and does not allow for custom HTTP headers (such as Authorization, x-tenant-id, x-agent-id). It strictly expects OAuth, which we do not have the scope or time to implement during this hackathon.

## Decision
As a deliberate hackathon-scope workaround, we will modify the proxy-engine's ingress router to accept the API key, tenant ID, and agent ID as query parameters (e.g., ?api_key=sk_pro_...&tenant_id=...&agent_id=...) in addition to their standard HTTP headers.

## Consequences
- **Security:** Passing API keys and sensitive context in query parameters is generally an anti-pattern as they can be logged in web server access logs.
- **Future Action:** Post-hackathon, we must revert this change and implement proper OAuth 2.0 flows and dedicated headers.
