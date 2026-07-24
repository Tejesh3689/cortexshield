# ADR 0004: Idempotency in Memory Write Jobs

## Status
Accepted

## Context & Decision
The `healing-worker` processes memory writes asynchronously from NATS JetStream via an at-least-once delivery model. This creates a risk of duplicate message processing if a worker crashes before acknowledging a message, which would result in duplicate edges in the Neo4j graph.

To ensure strict idempotency, we added a `job_id` field to the `MemoryWriteJob` schema (defaulting to a new UUID if not provided by the proxy). The `healing-worker` utilizes Redis (`SETNX`) to deduplicate incoming messages against this `job_id` with a 24-hour expiration window. Any message with an already-processed `job_id` is immediately acknowledged and discarded without re-triggering the LLM or graph writes.
