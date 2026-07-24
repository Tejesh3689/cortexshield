# ADR 0007: Realtime Gateway WebSocket Architecture

## Status
Accepted

## Context
In Milestone 8/8.5, we implemented the Next.js `portal-web` graph visualization. This requires a persistent WebSocket connection to push real-time NATS events (`graph.updates`) to the browser whenever `healing-worker` mutates the graph.

Next.js API routes are serverless-first and do not natively support long-lived WebSocket connections.

## Decision
We decided **not** to host the WebSocket server on `proxy-engine`. Instead, we created a new microservice: `apps/realtime-gateway`.

**Why not proxy-engine?**
1. Separation of concerns: `proxy-engine` is highly optimized for the synchronous LLM JSON-RPC fast-path. Tying up connection pools with thousands of persistent idle browser WebSockets could degrade the <15ms latency SLA for the firewall.
2. Auth Context: Browser sessions (Clerk JWTs) require a different authentication mechanism (browser -> tenant) than the server-to-server API keys used by `proxy-engine`.

**How it works:**
1. `healing-worker` executes a Neo4j write and synchronously publishes a fire-and-forget payload to the `graph.updates` NATS subject.
2. `realtime-gateway` (FastAPI) consumes `graph.updates` and multiplexes the message to connected WebSocket clients based on the `tenant_id` claim validated from their Clerk token (via the extended `cortex_auth`).
3. The React client (`react-force-graph-3d`) dynamically renders the new node/edge without polling.
