import json
from .memory_ingest_fastpath import handle_add_memory
from ..firewall.action_firewall import decide
from ..egress.response_sanitizer import sanitize_tool_response
from cortex_schemas.models import ToolCallRequest, ToolCallResponse

# Mock of an actual tool execution for the proxy
async def execute_tool(req: ToolCallRequest) -> ToolCallResponse:
    # In a real proxy, this forwards to the target. Here we mock it.
    return ToolCallResponse(id=req.id, result={"status": "executed", "data": "dummy data"})

async def process_jsonrpc(request_data: dict, tenant_id: str, agent_id: str) -> dict:
    req_id = request_data.get("id")
    method = request_data.get("method")
    
    # 1. MCP Protocol Handshake Initialization
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": request_data.get("params", {}).get("protocolVersion", "2024-11-05"),
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": "CortexShield-MCP-Proxy",
                    "version": "1.0.0"
                }
            }
        }

    # 2. MCP Initialization Notification / Ping
    if method in ("notifications/initialized", "initialized", "ping"):
        if req_id is not None:
            return {"jsonrpc": "2.0", "id": req_id, "result": {}}
        return {}

    # 3. MCP Tool Discovery (tools/list)
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "add_memory",
                        "description": "Store a user fact or entity observation into CortexShield cognitive memory graph.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string", "description": "The fact or memory text to store."}
                            },
                            "required": ["text"]
                        }
                    },
                    {
                        "name": "query_vector",
                        "description": "Query vector embeddings store for semantic similarity entity matching.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Search query text"}
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "send_webhook",
                        "description": "Restricted tool: Sends external webhooks (restricted by CortexShield policy).",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "url": {"type": "string", "description": "Webhook target URL"},
                                "data": {"type": "string", "description": "Payload data"}
                            },
                            "required": ["url"]
                        }
                    },
                    {
                        "name": "execute_shell_command",
                        "description": "Restricted tool: Executes shell commands (restricted by CortexShield policy).",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "command": {"type": "string", "description": "Shell command line"}
                            },
                            "required": ["command"]
                        }
                    }
                ]
            }
        }

    # 4. MCP Tool Invocation (tools/call)
    if method == "tools/call":
        req = ToolCallRequest(**request_data)
        tool_name = req.params.get("name", "unknown")

        from ..db import async_session_maker
        async with async_session_maker() as session:
            decision = await decide(req, tenant_id, agent_id, session=session)

        if decision.decision.value == "DENY":
            return ToolCallResponse(id=req.id, error={"code": -32000, "message": f"Denied: {decision.reason}"}).model_dump(exclude_none=True)
            
        if tool_name == "add_memory":
            response = await handle_add_memory(req, tenant_id, agent_id)
            safe_response = await sanitize_tool_response(response, tenant_id, agent_id, tool_name)
            return safe_response.model_dump(exclude_none=True)
            
        # Execute tool and intercept response
        raw_response = await execute_tool(req)
        
        # EGRESS SANITIZATION
        safe_response = await sanitize_tool_response(raw_response, tenant_id, agent_id, tool_name)
        return safe_response.model_dump(exclude_none=True)
        
    return ToolCallResponse(id=req_id, error={"code": -32601, "message": f"Method '{method}' not found"}).model_dump(exclude_none=True)
