import * as readline from "readline";
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
        process.stdout.write(JSON.stringify(responseData) + "\n");
        
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
        process.stdout.write(JSON.stringify(errorResponse) + "\n");
      }
    });
  }
}
