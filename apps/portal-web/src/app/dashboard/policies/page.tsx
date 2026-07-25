"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileCode,
  Power,
  RefreshCw,
  Plus,
  Copy,
  Check
} from "lucide-react";

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

const MOCK_POLICIES: PolicyRule[] = [
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

export default function PoliciesPage() {
  const [mounted, setMounted] = useState(false);
  const [policies, setPolicies] = useState<PolicyRule[]>(MOCK_POLICIES);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRule>(MOCK_POLICIES[0]);
  const [globalStrict, setGlobalStrict] = useState(true);
  const [copied, setCopied] = useState(false);

  const filteredPolicies = policies.filter((p) => {
    if (selectedCategory !== "ALL" && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const togglePolicyStatus = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "ACTIVE" ? "DISABLED" : "ACTIVE" } : p))
    );
    if (selectedPolicy.id === id) {
      setSelectedPolicy((prev) => ({
        ...prev,
        status: prev.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      }));
    }
  };

  const handleCopyRego = () => {
    navigator.clipboard.writeText(selectedPolicy.regoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-6 md:p-8 space-y-6 bg-[#090d16] min-h-screen text-slate-100 font-sans select-none flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-[#737ccf] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#090d16] min-h-screen text-slate-100 font-sans select-none" suppressHydrationWarning>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1b273d] pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[#737ccf]">
            <Lock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
              AI FIREWALL POLICIES & GUARDRAILS
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Open Policy Agent (OPA) Rego Rules & Preventative Security Matrix
            </p>
          </div>
        </div>

        {/* Global Control Toggle Switch */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-3 bg-[#0e1424] border border-[#1b273d] px-4 py-2 rounded-xl">
            <span className="text-slate-400">ENFORCEMENT MODE:</span>
            <button
              onClick={() => setGlobalStrict(!globalStrict)}
              className={`flex items-center gap-1.5 font-bold transition-all ${
                globalStrict ? "text-[#5cd3c1]" : "text-amber-400"
              }`}
            >
              <Power size={14} /> {globalStrict ? "STRICT PREVENTATIVE" : "AUDIT ONLY"}
            </button>
          </div>

          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#737ccf] text-white font-bold rounded-xl shadow-md hover:bg-[#858de0]">
            <Plus size={14} /> Add Policy Rule
          </button>
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0e1424] p-3 rounded-xl border border-[#1b273d] font-mono">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policy name, rule ID..."
            className="w-full bg-[#131b2e] border border-[#202e48] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5cd3c1]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-lg border border-[#202e48] w-full sm:w-auto overflow-x-auto text-xs">
          {["ALL", "PROMPT INJECTION", "PII & SECRETS", "TOOL GUARDRAILS", "MEMORY SAFETY"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#1f2d47] text-white font-bold border-b-2 border-[#5cd3c1]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Policy Cards List & Rego Code Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
        {/* Left 2 Columns: Policy Cards Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredPolicies.map((policy) => {
              const isSelected = selectedPolicy.id === policy.id;
              const isActive = policy.status === "ACTIVE";
              return (
                <div
                  key={policy.id}
                  onClick={() => setSelectedPolicy(policy)}
                  className={`bg-[#0e1424]/90 border rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-md hover:border-[#5cd3c1]/60 ${
                    isSelected ? "border-[#5cd3c1] bg-[#121a2e]" : "border-[#1b273d]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#5cd3c1]">{policy.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#172238] text-slate-300 font-semibold border border-[#202e48]">
                          {policy.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            policy.severity === "CRITICAL"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : policy.severity === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          }`}
                        >
                          {policy.severity}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{policy.name}</h3>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePolicyStatus(policy.id);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                        isActive
                          ? "bg-[#5cd3c1]/10 text-[#5cd3c1] border-[#5cd3c1]/40"
                          : "bg-slate-800 text-slate-500 border-slate-700"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "DISABLED"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{policy.description}</p>

                  <div className="flex justify-between items-center pt-2 border-t border-[#172238] text-[11px]">
                    <span className="text-slate-400">
                      Enforcement Action: <span className="text-white font-bold">{policy.action}</span>
                    </span>
                    <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                      <Code2 size={13} /> View Rego Policy
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Column: OPA Rego Code Inspector Drawer */}
        <aside className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1b273d] pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileCode size={15} className="text-[#5cd3c1]" /> Rego Policy Code Viewer
            </h3>
            <button
              onClick={handleCopyRego}
              className="p-1.5 rounded bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white flex items-center gap-1 text-[10px]"
            >
              {copied ? <Check size={13} className="text-[#5cd3c1]" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {selectedPolicy ? (
            <div className="space-y-4 text-xs">
              <div className="bg-[#131b2e] border border-[#202e48] p-3 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-400">{selectedPolicy.id}</p>
                <h4 className="font-bold text-white text-sm">{selectedPolicy.name}</h4>
                <p className="text-[10px] text-[#5cd3c1]">Category: {selectedPolicy.category}</p>
              </div>

              {/* Code Box */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase text-slate-400 font-mono">OPA Rego Script v0.62</span>
                  <span className="text-[10px] text-emerald-400 font-bold">SYNTAX VALID</span>
                </div>
                <pre className="bg-[#070a12] border border-[#1b273d] p-3.5 rounded-xl text-[#5cd3c1] font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80">
                  {selectedPolicy.regoCode}
                </pre>
              </div>

              <div className="pt-2 border-t border-[#1b273d]">
                <button
                  onClick={() => togglePolicyStatus(selectedPolicy.id)}
                  className={`w-full py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedPolicy.status === "ACTIVE"
                      ? "bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-[#5cd3c1]/10 border border-[#5cd3c1]/40 text-[#5cd3c1] hover:bg-[#5cd3c1]/20"
                  }`}
                >
                  <Power size={14} />
                  {selectedPolicy.status === "ACTIVE" ? "Disable Policy Rule" : "Enable Policy Rule"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Select a policy card to view Rego code.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
