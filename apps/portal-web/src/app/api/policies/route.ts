import { NextResponse } from "next/server";

export interface PolicyRule {
  id: string;
  name: string;
  category: "PROMPT INJECTION" | "PII & SECRETS" | "TOOL GUARDRAILS" | "MEMORY SAFETY";
  action: "BLOCK & LOG" | "SANITIZE" | "BLOCK & ALERT" | "QUARANTINE" | "THROTTLE";
  status: "ACTIVE" | "DISABLED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  regoCode: string;
}

let POLICIES_STORE: PolicyRule[] = [
  {
    id: "PR-INJ-001",
    name: "Prompt Injection & System Prompt Guard",
    category: "PROMPT INJECTION",
    action: "BLOCK & LOG",
    status: "ACTIVE",
    severity: "CRITICAL",
    description: "Blocks jailbreak patterns, DAN prompts, and system prompt override attempts in incoming user queries.",
    regoCode: `package cortexshield.prompt_injection

default allow = true

deny[msg] {
    input.prompt_tokens[_] == "ignore previous instructions"
    msg := "Jailbreak signature detected in user prompt stream."
}

deny[msg] {
    regex.match("(?i)(system prompt|reveal secret|override rules)", input.prompt)
    msg := "System prompt exfiltration attempt intercepted."
}`,
  },
  {
    id: "PII-MASK-002",
    name: "PII & Secret Data Masking Engine",
    category: "PII & SECRETS",
    action: "SANITIZE",
    status: "ACTIVE",
    severity: "HIGH",
    description: "Detects and redacts SSNs, Credit Card numbers, API Keys, and JWT tokens before LLM inference.",
    regoCode: `package cortexshield.pii_masking

sanitize_fields := ["ssn", "credit_card", "api_key", "bearer_token"]

mask_pattern[field] {
    sanitize_fields[_] == field
}`,
  },
  {
    id: "TOOL-GUARD-003",
    name: "Restricted Tool Execution Guardrail",
    category: "TOOL GUARDRAILS",
    action: "BLOCK & ALERT",
    status: "ACTIVE",
    severity: "CRITICAL",
    description: "Restricts execution of un-authenticated shell scripts, database table drops, and untrusted webhooks.",
    regoCode: `package cortexshield.restricted_tools

restricted_set := {"execute_shell_command", "drop_database_table", "send_webhook"}

is_restricted[tool_name] {
    restricted_set[tool_name]
}

deny[msg] {
    is_restricted[input.tool_name]
    not input.user_role == "ADMIN"
    msg := sprintf("Tool '%s' is restricted by security policy.", [input.tool_name])
}`,
  },
  {
    id: "MEM-POIS-004",
    name: "Vector Memory Node Quarantine Shield",
    category: "MEMORY SAFETY",
    action: "QUARANTINE",
    status: "ACTIVE",
    severity: "HIGH",
    description: "Quarantines memory nodes with cosine similarity < 0.20 or missing cryptographic hash provenance.",
    regoCode: `package cortexshield.memory_quarantine

quarantine_node[node_id] {
    input.similarity_score < 0.20
}

quarantine_node[node_id] {
    not input.provenance_hash
}`,
  },
  {
    id: "RATE-LIMIT-005",
    name: "Token Meter & Burst Rate Limiter",
    category: "TOOL GUARDRAILS",
    action: "THROTTLE",
    status: "ACTIVE",
    severity: "MEDIUM",
    description: "Caps burst request volume to 100 requests / sec per tenant to prevent DDoS and API quota depletion.",
    regoCode: `package cortexshield.rate_limit

default allow = true

deny[msg] {
    input.request_rate_per_sec > 100
    msg := "Tenant request rate limit exceeded."
}`,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    policies: POLICIES_STORE,
    count: POLICIES_STORE.length,
    activeCount: POLICIES_STORE.filter((p) => p.status === "ACTIVE").length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, policy } = body;

    if (action === "toggle" && id) {
      POLICIES_STORE = POLICIES_STORE.map((p) =>
        p.id === id ? { ...p, status: p.status === "ACTIVE" ? "DISABLED" : "ACTIVE" } : p
      );
      return NextResponse.json({ success: true, policies: POLICIES_STORE });
    }

    if (action === "create" && policy) {
      // Validate basic Rego syntax structure
      if (!policy.regoCode || !policy.regoCode.includes("package")) {
        return NextResponse.json(
          { success: false, error: "Invalid Rego syntax: missing 'package' declaration." },
          { status: 400 }
        );
      }

      const newPolicy: PolicyRule = {
        id: policy.id || `PR-CUSTOM-${Date.now().toString().slice(-4)}`,
        name: policy.name || "Custom Rego Policy Rule",
        category: policy.category || "PROMPT INJECTION",
        action: policy.action || "BLOCK & LOG",
        status: "ACTIVE",
        severity: policy.severity || "HIGH",
        description: policy.description || "Custom user-defined Open Policy Agent rule.",
        regoCode: policy.regoCode,
      };

      POLICIES_STORE.unshift(newPolicy);
      return NextResponse.json({ success: true, policy: newPolicy, policies: POLICIES_STORE });
    }

    return NextResponse.json({ success: false, error: "Invalid policy action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
