---
sidebar_position: 4
---

# How the Trust Firewall Works

CortexShield operates on a fundamentally different paradigm than static rule-based API gateways. It uses a **Dynamic Trust Score** powered by an online machine learning engine and a self-healing memory graph.

Here is a developer-centric overview of how a decision is made.

## 1. The Request

When your agent makes a tool call (e.g., trying to execute a shell command), it hits the CortexShield Gateway. 

## 2. Fast-Path Caching

We don't block the request to do heavy machine learning. Instead, CortexShield immediately checks a sub-millisecond cache for the agent/user's **current trust score**. 

If the user has been behaving normally, their trust score is high (e.g., `0.95`).

## 3. Open Policy Agent (OPA) Evaluation

The requested tool, the parameters, and the current trust score are passed into our OPA policy engine. 

You can define rules like:
> *"Allow `execute_shell_command` ONLY IF the `trust_score` > `0.80`"*

If the threshold is met, the tool executes immediately. 

## 4. Asynchronous Anomaly Detection & Self-Healing

Behind the scenes (completely out of your agent's critical request path), CortexShield does the heavy lifting:

1. **Online ML**: An Isolation Forest model analyzes the sequence of tool calls. If it detects a sudden behavioral shift (e.g., an attacker trying to exfiltrate data), it flags the trajectory as anomalous.
2. **Cognitive Graph**: The raw context of the interaction is mapped into an entity graph. If the agent contradicts a known system rule (e.g., trying to override a system prompt), a Graph Cycle is detected.

If either of these engines detects a threat, the user's overall **Trust Score is immediately downgraded** in the fast-path cache.

The very next time they try to execute a sensitive tool, step 3 (OPA Evaluation) will instantly deny the request. 

This architecture guarantees sub-15ms overhead on your agent's tool calls while providing enterprise-grade, ML-backed protection.
