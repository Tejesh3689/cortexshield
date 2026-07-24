const { spawn } = require('child_process');

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
  
  proxy.stdin.write(JSON.stringify(request) + "\n");
});
