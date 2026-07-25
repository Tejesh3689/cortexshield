"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Search,
  Plus,
  Trash2,
  Check,
  Copy,
  Code2,
  FileCode,
  Power,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Info
} from "lucide-react";

export interface TenantRule {
  id: string;
  tenant_id: string;
  rule_type: "restricted_tool" | "trust_threshold" | "poison_keyword";
  rule_value: any;
  enabled: boolean;
  created_at?: string;
}

export interface RegoPolicy {
  id: string;
  name: string;
  category: string;
  action: string;
  status: "ACTIVE" | "DISABLED";
  severity: string;
  description: string;
  regoCode: string;
}

const DEFAULT_REGO_POLICIES: RegoPolicy[] = [
  {
    id: "PR-INJ-001",
    name: "Prompt Injection Guard",
    category: "PROMPT INJECTION",
    action: "BLOCK & LOG",
    status: "ACTIVE",
    severity: "CRITICAL",
    description: "Blocks jailbreak patterns and system prompt override attempts.",
    regoCode: `package cortexshield.prompt_injection\ndefault allow = true\ndeny[msg] {\n    input.prompt_tokens[_] == "ignore previous instructions"\n    msg := "Jailbreak signature detected."\n}`,
  },
  {
    id: "PII-MASK-002",
    name: "PII & Secret Data Redaction",
    category: "PII & SECRETS",
    action: "SANITIZE",
    status: "ACTIVE",
    severity: "HIGH",
    description: "Redacts SSNs, credit cards, and API tokens before LLM inference.",
    regoCode: `package cortexshield.pii_masking\nsanitize_fields := ["ssn", "credit_card", "api_key"]`,
  },
];

import { SkeletonLoader, ErrorBanner, EmptyStatePrompt } from "@/components/StatusBanners";

export default function PoliciesPage() {
  const [mounted, setMounted] = useState(false);
  const [tenantRules, setTenantRules] = useState<TenantRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [newRuleType, setNewRuleType] = useState<"restricted_tool" | "trust_threshold" | "poison_keyword">("restricted_tool");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedRego, setSelectedRego] = useState<RegoPolicy>(DEFAULT_REGO_POLICIES[0]);

  // Fetch tenant policies
  const fetchTenantRules = async () => {
    try {
      setLoadingRules(true);
      setFetchError(null);
      const res = await fetch("/api/policies?tenant_id=tenant_pro_1");
      if (!res.ok) throw new Error("Unable to load security policies — retrying in 5s");
      const data = await res.json();
      if (data.success && data.rules) {
        setTenantRules(data.rules);
      }
    } catch (err: any) {
      console.error("Error loading tenant rules:", err);
      setFetchError("Unable to load security policies — retrying in 5s");
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTenantRules();
  }, []);

  // Add rule submit handler
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleValue.trim()) {
      setFormError("Please enter a rule value.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      let formattedVal: any = newRuleValue.trim();
      if (newRuleType === "restricted_tool") {
        formattedVal = { tool: newRuleValue.trim() };
      } else if (newRuleType === "trust_threshold") {
        const num = parseFloat(newRuleValue.trim());
        if (isNaN(num)) {
          setFormError("Threshold must be a valid number (e.g. 0.3)");
          setIsSubmitting(false);
          return;
        }
        formattedVal = { threshold: num };
      } else {
        formattedVal = { keyword: newRuleValue.trim() };
      }

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: "tenant_pro_1",
          rule_type: newRuleType,
          rule_value: formattedVal,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewRuleValue("");
        await fetchTenantRules();
      } else {
        setFormError(data.error || "Failed to add rule.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle rule enabled/disabled
  const handleToggleRule = async (rule: TenantRule) => {
    const updatedEnabled = !rule.enabled;
    setTenantRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: updatedEnabled } : r))
    );

    try {
      await fetch(`/api/policies/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: updatedEnabled }),
      });
    } catch (e) {
      console.error("Toggle rule error:", e);
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    setTenantRules((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/policies/${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Delete rule error:", e);
    }
  };

  const handleCopyRego = () => {
    navigator.clipboard.writeText(selectedRego.regoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!mounted) {
    return (
      <div className="p-6 md:p-8 space-y-6 bg-[#090d16] min-h-screen text-slate-100 font-sans select-none flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-[#737ccf] rounded-full animate-spin" />
      </div>
    );
  }

  const filteredRules = tenantRules.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const valStr = typeof r.rule_value === "object" ? JSON.stringify(r.rule_value) : String(r.rule_value);
    return r.rule_type.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#090d16] min-h-screen text-slate-100 font-sans select-none" suppressHydrationWarning>
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
              Row-Level Multi-Tenant Policy Enforcer & Restricted Tool Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0e1424] border border-[#1b273d] px-4 py-2 rounded-xl font-mono text-xs text-[#5cd3c1]">
          <ShieldCheck size={16} />
          <span className="font-bold">OPA ENFORCEMENT: ACTIVE</span>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono">
        {/* Left 2 Columns: Rule List & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Rule Form Card */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus size={16} className="text-[#5cd3c1]" /> Add Tenant Guardrail Rule
            </h2>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Rule Type Dropdown */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[11px] text-slate-400 font-bold uppercase">Rule Type</label>
                  <select
                    value={newRuleType}
                    onChange={(e: any) => setNewRuleType(e.target.value)}
                    className="w-full bg-[#131b2e] border border-[#202e48] text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#5cd3c1]"
                  >
                    <option value="restricted_tool">Restricted Tool</option>
                    <option value="trust_threshold">Trust Threshold</option>
                    <option value="poison_keyword">Poison Keyword</option>
                  </select>
                </div>

                {/* Rule Value Input */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] text-slate-400 font-bold uppercase">Rule Value</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={
                        newRuleType === "restricted_tool"
                          ? "e.g. send_webhook or execute_shell_command"
                          : newRuleType === "trust_threshold"
                          ? "e.g. 0.3"
                          : "e.g. ignore previous instructions"
                      }
                      className="flex-1 bg-[#131b2e] border border-[#202e48] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#5cd3c1]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-[#737ccf] hover:bg-[#858de0] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Plus size={14} /> Add Rule
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {formError}
                </p>
              )}

              {/* Status Note Below Form */}
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400 border-t border-[#172238]">
                <Clock size={14} className="text-[#5cd3c1]" />
                <span>Policy changes apply within 60 seconds</span>
              </div>
            </form>
          </div>

          {/* Rules List Panel */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1b273d] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Lock size={16} className="text-[#737ccf]" /> Tenant Active Security Rules
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Configured rules enforced during tool calls and LLM inference</p>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter rules..."
                  className="w-full bg-[#131b2e] border border-[#202e48] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#5cd3c1]"
                />
              </div>
            </div>

            {fetchError ? (
              <ErrorBanner message={fetchError} onRetry={fetchTenantRules} />
            ) : loadingRules ? (
              <SkeletonLoader rows={3} />
            ) : filteredRules.length === 0 ? (
              <EmptyStatePrompt
                title="No active security policy rules"
                description="Connect your AI agent or add a rule above to customize CortexShield security enforcement."
              />
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const valDisplay =
                    typeof rule.rule_value === "object"
                      ? rule.rule_value.tool || rule.rule_value.threshold || rule.rule_value.keyword || JSON.stringify(rule.rule_value)
                      : String(rule.rule_value);

                  return (
                    <div
                      key={rule.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        rule.enabled
                          ? "bg-[#131b2e] border-[#202e48] hover:border-[#5cd3c1]/40"
                          : "bg-[#0b0f19] border-[#172238] opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Type Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border shrink-0 ${
                            rule.rule_type === "restricted_tool"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : rule.rule_type === "trust_threshold"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-purple-500/10 text-[#737ccf] border-purple-500/30"
                          }`}
                        >
                          [{rule.rule_type}]
                        </span>

                        {/* Value Display */}
                        <span className="font-bold text-white text-xs">{valDisplay}</span>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {/* Enabled Toggle Button */}
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                            rule.enabled
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                            }`}
                          />
                          <span>{rule.enabled ? "ON" : "OFF"}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/60 hover:text-white transition-all text-xs flex items-center gap-1"
                          title="Delete Rule"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Rego Code Reference */}
        <aside className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-6 space-y-4 shadow-2xl h-fit">
          <div className="flex items-center justify-between border-b border-[#1b273d] pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileCode size={15} className="text-[#5cd3c1]" /> Rego Policy Blueprint
            </h3>
            <button
              onClick={handleCopyRego}
              className="p-1.5 rounded bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white flex items-center gap-1 text-[10px]"
            >
              {copied ? <Check size={13} className="text-[#5cd3c1]" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-[#131b2e] border border-[#202e48] p-3 rounded-xl space-y-1">
              <span className="font-bold text-[#5cd3c1]">{selectedRego.name}</span>
              <p className="text-[11px] text-slate-400">{selectedRego.description}</p>
            </div>

            <pre className="p-3.5 bg-[#080c14] border border-[#172238] rounded-xl text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto select-text">
              {selectedRego.regoCode}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
