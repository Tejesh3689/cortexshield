const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    // ---------------------------------------------------------
    // packages/shared-types
    // ---------------------------------------------------------
    "packages/shared-types/package.json": `{
  "name": "@cortexshield/shared-types",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
`,
    "packages/shared-types/tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "declaration": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["src/**/*"]
}
`,
    "packages/shared-types/src/index.ts": `export interface ToolCallRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface ToolCallResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
`,

    // ---------------------------------------------------------
    // packages/proxy-mcp-sdk
    // ---------------------------------------------------------
    "packages/proxy-mcp-sdk/package.json": `{
  "name": "@cortexshield/proxy-mcp",
  "version": "0.1.0",
  "description": "MCP proxy client for routing agent traffic through CortexShield",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "cortex-mcp": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@cortexshield/shared-types": "workspace:*"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["mcp", "ai", "proxy", "security"]
}
`,
    "packages/proxy-mcp-sdk/tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
`,
    "packages/proxy-mcp-sdk/src/index.ts": `import * as readline from "readline";
import type { ToolCallRequest, ToolCallResponse } from "@cortexshield/shared-types";

export class McpProxy {
  private gatewayUrl: string;
  private apiKey: string;
  
  constructor(gatewayUrl: string, apiKey: string) {
    this.gatewayUrl = gatewayUrl;
    this.apiKey = apiKey;
  }
  
  public startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    rl.on("line", async (line) => {
      if (!line.trim()) return;
      
      try {
        const payload = JSON.parse(line) as ToolCallRequest;
        
        // Proxy to the CortexShield backend
        const res = await fetch(this.gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey
          },
          body: JSON.stringify(payload)
        });
        
        const responseData = await res.json() as ToolCallResponse;
        
        // Write the response back to stdout for the MCP client (Cursor/Claude)
        process.stdout.write(JSON.stringify(responseData) + "\\n");
        
      } catch (e: any) {
        // Construct standard JSON-RPC error
        const errorResponse: ToolCallResponse = {
          jsonrpc: "2.0",
          id: null as any, // Cannot reliably determine id if parse failed
          error: {
            code: -32603,
            message: e.message || "Internal error in proxy SDK"
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + "\\n");
      }
    });
  }
}
`,
    "packages/proxy-mcp-sdk/src/cli.ts": `#!/usr/bin/env node
import { McpProxy } from "./index";

const gatewayUrl = process.env.CORTEXSHIELD_GATEWAY_URL;
const apiKey = process.env.CORTEXSHIELD_API_KEY;

if (!gatewayUrl || !apiKey) {
  console.error("Missing required environment variables: CORTEXSHIELD_GATEWAY_URL, CORTEXSHIELD_API_KEY");
  process.exit(1);
}

const proxy = new McpProxy(gatewayUrl, apiKey);
proxy.startStdio();
`,
    "packages/proxy-mcp-sdk/README.md": `# @cortexshield/proxy-mcp

A thin MCP proxy client that routes your LLM agent's traffic through the CortexShield security gateway.

## Usage

Simply add this package as an MCP server in your ` + "`mcp.json`" + ` (for Claude Desktop, Cursor, or your custom agent):

\`\`\`json
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
\`\`\`

All stdio JSON-RPC tool calls will be transparently proxied to the CortexShield proxy-engine for anomaly detection, graph self-healing, and policy evaluation before executing.
`,

    // ---------------------------------------------------------
    // Verification Test
    // ---------------------------------------------------------
    "scripts/verify-mcp-proxy.js": `const { spawn } = require('child_process');

console.log("Verifying @cortexshield/proxy-mcp via stdio...");

// Provide a mock gateway URL. We don't actually hit proxy-engine since docker is down,
// but we mock an http server in node to verify the round-trip works.
const http = require('http');

const mockServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    const payload = JSON.parse(body);
    
    // Verify API key header was sent
    if (req.headers['x-api-key'] !== 'test_key') {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    
    // Return mock MCP response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: payload.id,
      result: { status: "success", intercepted: true }
    }));
  });
});

mockServer.listen(8081, () => {
  // Start the proxy CLI as a child process
  const proxy = spawn('node', ['packages/proxy-mcp-sdk/dist/cli.js'], {
    env: {
      ...process.env,
      CORTEXSHIELD_GATEWAY_URL: 'http://localhost:8081/jsonrpc',
      CORTEXSHIELD_API_KEY: 'test_key'
    }
  });
  
  let output = '';
  proxy.stdout.on('data', (data) => {
    output += data.toString();
    console.log("[MCP Proxy Output]:", output.trim());
    
    if (output.includes('intercepted')) {
      console.log("SUCCESS: MCP traffic round-tripped correctly through the proxy SDK.");
      proxy.kill();
      mockServer.close();
      process.exit(0);
    }
  });
  
  proxy.stderr.on('data', (data) => {
    console.error("[MCP Proxy Error]:", data.toString());
  });
  
  // Send a JSON-RPC payload via stdin
  const request = {
    jsonrpc: "2.0",
    id: 42,
    method: "test_tool",
    params: { arg: "value" }
  };
  
  proxy.stdin.write(JSON.stringify(request) + "\\n");
});
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

console.log("Milestone 5.5 files created successfully.");
