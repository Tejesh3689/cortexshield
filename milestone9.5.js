const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = "D:\\cortexshield";
const docsDir = path.join(rootDir, "apps", "docs-site");

// 1. Scaffold Docusaurus
if (!fs.existsSync(docsDir)) {
    console.log("Scaffolding Docusaurus site...");
    execSync('npx create-docusaurus@latest docs-site classic --typescript', {
        cwd: path.join(rootDir, "apps"),
        stdio: 'inherit'
    });
}

const files = {
    // ---------------------------------------------------------
    // docs/adr/0012-docs-site-framework.md
    // ---------------------------------------------------------
    "docs/adr/0012-docs-site-framework.md": `# ADR 0012: Documentation Framework (Milestone 9.5)

## Status
Accepted

## Context
Milestone 9.5 requires scaffolding a public-facing developer documentation site (\`apps/docs-site\`) containing our MCP proxy quickstart, API reference, and high-level firewall conceptual explanations. We needed to choose between Mintlify and Docusaurus.

## Decision
We selected **Docusaurus**.
While Mintlify offers exceptional out-of-the-box aesthetics, it heavily steers towards its hosted platform for full feature parity and analytics. Docusaurus is fully open-source, entirely local, and integrates flawlessly into our existing pnpm/Turborepo React monorepo architecture. It allows us to seamlessly share UI components from our \`@cortexshield/ui\` workspace if we choose to embed live graph components into the docs later.

## Consequences
- The docs site builds as a standard static React SPA and can be deployed anywhere (Vercel, AWS S3, GitHub Pages) without vendor lock-in.
- API references are currently maintained in Markdown, but Docusaurus supports OpenAPI plugins that we can wire directly into our FastAPI OpenAPI spec in the future.
`,

    // ---------------------------------------------------------
    // apps/docs-site/docs/intro.md (Override Default)
    // ---------------------------------------------------------
    "apps/docs-site/docs/intro.md": `---
sidebar_position: 1
---

# CortexShield Developer Docs

Welcome to the **CortexShield** developer documentation.

CortexShield is a context-aware security gateway for LLM agents. We protect your enterprise data by acting as a zero-trust firewall for your agent's tool calls (MCP), backed by an online machine learning anomaly detection engine and a self-healing cognitive graph.

Get started by checking out the [Quickstart Guide](./quickstart).
`,

    // ---------------------------------------------------------
    // apps/docs-site/docs/quickstart.md
    // ---------------------------------------------------------
    "apps/docs-site/docs/quickstart.md": `---
sidebar_position: 2
---

# Quickstart

Integrate CortexShield into your AI agent's workflow in less than 2 minutes using our official MCP SDK.

## 1. Install the SDK

Our thin proxy client routes your LLM agent's traffic through your CortexShield instance. You do not need to install it in your project; you can invoke it directly via \`npx\` in your agent's MCP configuration.

## 2. Configure your Agent (Cursor / Claude Desktop)

Add the following configuration to your \`mcp.json\` or Claude Desktop config. 

Replace the \`CORTEXSHIELD_GATEWAY_URL\` with your proxy-engine endpoint and inject your \`CORTEXSHIELD_API_KEY\`.

\`\`\`json
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
\`\`\`

## 3. That's it!

All tool calls requested by your agent (e.g. "Execute this shell command" or "Read this database row") will be transparently routed to CortexShield. 

The proxy will evaluate the call against your tenant's anomaly models and restricted-tool policies. If it passes, it executes. If it's malicious, CortexShield intercepts it and returns a blocked status back to your agent.
`,

    // ---------------------------------------------------------
    // apps/docs-site/docs/api-reference.md
    // ---------------------------------------------------------
    "apps/docs-site/docs/api-reference.md": `---
sidebar_position: 3
---

# MCP Gateway API Reference

If you are building a custom agent without our \`@cortexshield/proxy-mcp\` SDK, you can interface directly with the Gateway endpoint using standard JSON-RPC 2.0.

## Endpoint

\`POST https://gateway.your-cortex-instance.com/jsonrpc\`

**Headers Required:**
- \`Content-Type: application/json\`
- \`X-API-Key: <your_tenant_api_key>\`

---

## Request Shape (\`ToolCallRequest\`)

Your payload must match standard MCP/JSON-RPC structure.

\`\`\`json
{
  "jsonrpc": "2.0",
  "id": "req_12345",
  "method": "execute_shell_command",
  "params": {
    "command": "cat /etc/passwd"
  }
}
\`\`\`

| Field | Type | Description |
|---|---|---|
| \`jsonrpc\` | string | Must be exactly \`"2.0"\`. |
| \`id\` | string \\| number | Unique identifier for the request. |
| \`method\` | string | The name of the tool/action the agent wants to perform. |
| \`params\` | object | (Optional) The arguments required for the tool. |

---

## Response Shape (\`ToolCallResponse\`)

CortexShield returns a synchronous response indicating whether the action was executed or blocked by the firewall.

### Success (Action Allowed & Executed)
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": "req_12345",
  "result": {
    "stdout": "...",
    "status": "success"
  }
}
\`\`\`

### Blocked (Anomaly Detected or Policy Denied)
If the trust score is too low or a Rego policy denies the action, the proxy returns a JSON-RPC error. Your agent should interpret this as a system-level rejection.

\`\`\`json
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
\`\`\`
`,

    // ---------------------------------------------------------
    // apps/docs-site/docs/trust-model.md
    // ---------------------------------------------------------
    "apps/docs-site/docs/trust-model.md": `---
sidebar_position: 4
---

# How the Trust Firewall Works

CortexShield operates on a fundamentally different paradigm than static rule-based API gateways. It uses a **Dynamic Trust Score** powered by an online machine learning engine and a self-healing memory graph.

Here is a developer-centric overview of how a decision is made.

## 1. The Request

When your agent makes a tool call (e.g., trying to execute a shell command), it hits the CortexShield Gateway. 

## 2. Fast-Path Caching

We don't block the request to do heavy machine learning. Instead, CortexShield immediately checks a sub-millisecond cache for the agent/user's **current trust score**. 

If the user has been behaving normally, their trust score is high (e.g., \`0.95\`).

## 3. Open Policy Agent (OPA) Evaluation

The requested tool, the parameters, and the current trust score are passed into our OPA policy engine. 

You can define rules like:
> *"Allow \`execute_shell_command\` ONLY IF the \`trust_score\` > \`0.80\`"*

If the threshold is met, the tool executes immediately. 

## 4. Asynchronous Anomaly Detection & Self-Healing

Behind the scenes (completely out of your agent's critical request path), CortexShield does the heavy lifting:

1. **Online ML**: An Isolation Forest model analyzes the sequence of tool calls. If it detects a sudden behavioral shift (e.g., an attacker trying to exfiltrate data), it flags the trajectory as anomalous.
2. **Cognitive Graph**: The raw context of the interaction is mapped into an entity graph. If the agent contradicts a known system rule (e.g., trying to override a system prompt), a Graph Cycle is detected.

If either of these engines detects a threat, the user's overall **Trust Score is immediately downgraded** in the fast-path cache.

The very next time they try to execute a sensitive tool, step 3 (OPA Evaluation) will instantly deny the request. 

This architecture guarantees sub-15ms overhead on your agent's tool calls while providing enterprise-grade, ML-backed protection.
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 9.5 files created successfully.");
