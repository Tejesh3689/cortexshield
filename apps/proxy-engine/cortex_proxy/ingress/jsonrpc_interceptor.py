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
    req = ToolCallRequest(**request_data)
    tool_name = req.params.get("name", "unknown")
    
    if req.method == "tools/call":
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
        
    return ToolCallResponse(id=req.id, error={"code": -32601, "message": "Method not found"}).model_dump(exclude_none=True)
