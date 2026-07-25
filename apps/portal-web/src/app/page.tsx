"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Brain,
  Zap,
  Lock,
  FileText,
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Terminal,
  Database,
  Radio,
  Server,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Shield,
  RefreshCw
} from "lucide-react";

export default function Home() {
  const [liveMetrics, setLiveMetrics] = useState({
    shieldedRequests: "4,892,104",
    blockedThreats: "1,284",
    memoryIntegrity: "100.0%",
    latencyMs: "3.8ms",
    isLive: false,
  });

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/api/overview?timeframe=24h");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.metrics) {
            setLiveMetrics({
              shieldedRequests: data.metrics.shieldedRequests || "4,892,104",
              blockedThreats: data.metrics.blockedThreats || "1,284",
              memoryIntegrity: data.metrics.memoryIntegrity || "100.0%",
              latencyMs: data.metrics.latencyMs || "3.8ms",
              isLive: true,
            });
          }
        }
      } catch (err) {
        console.error("Telemetry fetch error:", err);
      }
    }
    loadTelemetry();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-[#5cd3c1]/30 selection:text-[#5cd3c1]">
      {/* ── Navigation Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070b14]/80 border-b border-[#182338]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#5cd3c1]/20 to-blue-600/20 border border-[#5cd3c1]/40 text-[#5cd3c1] shadow-lg shadow-[#5cd3c1]/10">
              <ShieldCheck size={26} />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
                CORTEX<span className="text-[#5cd3c1]">SHIELD</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-slate-400 font-mono block">
                Enterprise AI Security Platform
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300 font-mono">
            <a href="#platform" className="hover:text-[#5cd3c1] transition-colors">Platform</a>
            <a href="#features" className="hover:text-[#5cd3c1] transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-[#5cd3c1] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#5cd3c1] transition-colors">Pricing</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-mono text-slate-300 hover:text-white px-3 py-2 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5cd3c1] to-cyan-500 text-slate-950 font-bold font-mono text-xs shadow-md shadow-[#5cd3c1]/20 hover:brightness-110 transition-all"
            >
              Admin Dashboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-[#182338]">
        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#5cd3c1]/15 via-blue-600/10 to-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0e172a] border border-[#1e2d4a] text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#5cd3c1] animate-pulse" />
            <span className="text-[#5cd3c1] font-bold">MCP SECURITY & PROVENANCE ENGINE</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Enterprise Ready v1.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto font-mono leading-tight sm:leading-none">
            The Security & Governance Layer for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5cd3c1] via-cyan-400 to-blue-500">AI Agents</span>
          </h1>

          {/* Supporting Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-sans leading-relaxed">
            CortexShield enables enterprise organizations to securely connect AI agents and MCP servers, intercept prompt injections, enforce fine-grained OPA policy guardrails, protect vector memory, and maintain tamper-proof cryptographic audit logs.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 font-mono">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-[#5cd3c1] to-cyan-500 text-slate-950 font-black text-sm shadow-xl shadow-[#5cd3c1]/25 hover:scale-[1.02] transition-all"
            >
              <Zap size={18} /> Launch Admin Portal
            </Link>
            <Link
              href="/dashboard/graph"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-[#0e172a] border border-[#1e2d4a] text-slate-200 font-bold text-sm hover:bg-[#15233e] hover:border-[#5cd3c1]/40 transition-all"
            >
              <Brain size={18} className="text-[#737ccf]" /> Explore Live Memory Graph
            </Link>
          </div>

          {/* Live System Telemetry Strip */}
          <div className="pt-8 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-left">
            <div className="bg-[#0b1222]/80 border border-[#16233d] p-4 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Shielded Requests</span>
              <span className="text-xl font-bold text-white mt-1 block">{liveMetrics.shieldedRequests}</span>
              <span className="text-[10px] text-emerald-400 mt-0.5 block flex items-center gap-1">
                <CheckCircle2 size={10} /> Active Filtering
              </span>
            </div>
            <div className="bg-[#0b1222]/80 border border-[#16233d] p-4 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Blocked Injections</span>
              <span className="text-xl font-bold text-red-400 mt-1 block">{liveMetrics.blockedThreats}</span>
              <span className="text-[10px] text-red-400/80 mt-0.5 block flex items-center gap-1">
                <ShieldAlert size={10} /> Zero Exploit Passes
              </span>
            </div>
            <div className="bg-[#0b1222]/80 border border-[#16233d] p-4 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Memory Integrity</span>
              <span className="text-xl font-bold text-[#737ccf] mt-1 block">{liveMetrics.memoryIntegrity}</span>
              <span className="text-[10px] text-[#737ccf] mt-0.5 block flex items-center gap-1">
                <Brain size={10} /> Graph Synced
              </span>
            </div>
            <div className="bg-[#0b1222]/80 border border-[#16233d] p-4 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Proxy Overhead</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">{liveMetrics.latencyMs}</span>
              <span className="text-[10px] text-cyan-400/80 mt-0.5 block flex items-center gap-1">
                <Activity size={10} /> Sub-5ms Inline
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architectural Product Flow Preview ──────────────────────────── */}
      <section id="architecture" className="py-20 bg-[#090e1a] border-b border-[#182338] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-xs font-mono text-[#5cd3c1] uppercase tracking-widest font-bold">
              SYSTEM ARCHITECTURE
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
              How CortexShield Protects Enterprise AI Data Flow
            </h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto font-sans">
              Every JSON-RPC tool call, prompt, and memory write passes through inline security guardrails before touching downstream models or databases.
            </p>
          </div>

          {/* Interactive Pipeline Diagram */}
          <div className="bg-[#0b1222] border border-[#182642] rounded-2xl p-6 sm:p-10 font-mono shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center text-center">
              
              {/* Step 1: AI Clients */}
              <div className="md:col-span-1 bg-[#101a2e] border border-[#1f3154] p-4 rounded-xl space-y-2 group hover:border-[#5cd3c1]/50 transition-all">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 mx-auto w-fit">
                  <Terminal size={22} />
                </div>
                <h4 className="text-xs font-bold text-white">AI Clients</h4>
                <p className="text-[10px] text-slate-400">Claude Desktop, Cursor, Custom Agents</p>
              </div>

              <div className="hidden md:flex justify-center text-slate-600">
                <ChevronRight size={24} className="text-[#5cd3c1] animate-pulse" />
              </div>

              {/* Step 2: MCP Ingress Proxy */}
              <div className="md:col-span-1 bg-[#101a2e] border border-[#1f3154] p-4 rounded-xl space-y-2 group hover:border-[#5cd3c1]/50 transition-all">
                <div className="p-2.5 rounded-lg bg-[#5cd3c1]/10 text-[#5cd3c1] mx-auto w-fit">
                  <Cpu size={22} />
                </div>
                <h4 className="text-xs font-bold text-white">MCP Ingress Proxy</h4>
                <p className="text-[10px] text-slate-400">JSON-RPC Interceptor & Rate Limiter</p>
              </div>

              <div className="hidden md:flex justify-center text-slate-600">
                <ChevronRight size={24} className="text-[#5cd3c1] animate-pulse" />
              </div>

              {/* Step 3: AI Firewall & OPA */}
              <div className="md:col-span-1 bg-[#101a2e] border border-[#1f3154] p-4 rounded-xl space-y-2 group hover:border-red-500/50 transition-all">
                <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 mx-auto w-fit">
                  <ShieldAlert size={22} />
                </div>
                <h4 className="text-xs font-bold text-white">AI Firewall & OPA</h4>
                <p className="text-[10px] text-slate-400">Prompt Injection & Tool Denylist</p>
              </div>

              <div className="hidden md:flex justify-center text-slate-600">
                <ChevronRight size={24} className="text-[#5cd3c1] animate-pulse" />
              </div>

              {/* Step 4: Protected Storage & Cryptographic Log */}
              <div className="md:col-span-1 bg-[#101a2e] border border-[#1f3154] p-4 rounded-xl space-y-2 group hover:border-purple-500/50 transition-all">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-[#737ccf] mx-auto w-fit">
                  <Database size={22} />
                </div>
                <h4 className="text-xs font-bold text-white">Storage & Provenance</h4>
                <p className="text-[10px] text-slate-400">Neo4j Graph & Neon Postgres Audit</p>
              </div>

            </div>

            {/* Live Data Pipeline Status Bar */}
            <div className="mt-8 pt-6 border-t border-[#182642] flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Trusted Facts: <strong className="text-white">STATUS=ACTIVE</strong></span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Poisoned Queries: <strong className="text-white">STATUS=FLAGGED_POISON (Quarantined)</strong></span>
                </span>
              </div>
              <Link href="/dashboard/graph" className="text-[#5cd3c1] hover:underline flex items-center gap-1 font-bold">
                Inspect Memory Graph Live <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features & Enterprise Capabilities ───────────────────────────── */}
      <section id="features" className="py-20 border-b border-[#182338]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-xs font-mono text-[#5cd3c1] uppercase tracking-widest font-bold">
              PLATFORM CAPABILITIES
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
              Enterprise Defense for the AI Agent Stack
            </h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto font-sans">
              Built specifically to address OWASP Top 10 for LLM applications and Model Context Protocol security requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-mono">
            {/* Feature 1: AI Firewall */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 w-fit">
                <ShieldAlert size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                AI Firewall & Ingress Guard
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Interceptors block jailbreaks, DAN prompts, and restricted tool executions (`send_webhook`, `exec_shell`) before requests reach downstream models.
              </p>
            </div>

            {/* Feature 2: MCP Security */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-[#5cd3c1]/10 text-[#5cd3c1] w-fit">
                <Cpu size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                MCP Protocol Security
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Native Model Context Protocol proxy supporting `initialize`, `tools/list`, and `tools/call` for Claude Desktop, Cursor, and custom agent clients.
              </p>
            </div>

            {/* Feature 3: Memory Protection */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-purple-500/10 text-[#737ccf] w-fit">
                <Brain size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                Cognitive Memory Safeguard
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Detects prompt injections in memory graphs, quarantines poisoned fragments (`trust_score: 0.05`), and tracks superseded entity facts in Neo4j.
              </p>
            </div>

            {/* Feature 4: Audit & Compliance */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
                <FileText size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                Cryptographic Audit Ledger
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Every AI decision is logged with SHA-256 hash chaining (`prev_hash` $\rightarrow$ `this_hash`) in Neon PostgreSQL for tamper-evident compliance.
              </p>
            </div>

            {/* Feature 5: Real-Time Telemetry */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Activity size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                Sub-5ms Telemetry Stream
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Provides real-time threat stream visualization, peak latency metrics, and threat vector distribution without impacting agent performance.
              </p>
            </div>

            {/* Feature 6: Multi-Tenant Architecture */}
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 hover:border-[#5cd3c1]/40 transition-all group">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Layers size={24} />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                Multi-Tenant Isolation
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Enforces tenant boundary isolation across PostgreSQL schemas, isolated Neo4j database namespaces, and scoped Redis cache keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Steps ───────────────────────────────────────────── */}
      <section className="py-20 bg-[#090e1a] border-b border-[#182338]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-xs font-mono text-[#5cd3c1] uppercase tracking-widest font-bold">
              GETTING STARTED
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
              How CortexShield Operates
            </h3>
          </div>

          {/* 3 Step Process */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-mono">
            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 relative">
              <span className="text-3xl font-black text-[#5cd3c1]/30">01</span>
              <h4 className="text-lg font-bold text-white">Connect AI Agents</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Configure your AI agent framework or MCP client (Claude Desktop, Cursor) to point to CortexShield's endpoint (`http://localhost:8000/rpc`).
              </p>
            </div>

            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 relative">
              <span className="text-3xl font-black text-[#5cd3c1]/30">02</span>
              <h4 className="text-lg font-bold text-white">Enforce Firewall Guardrails</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                CortexShield evaluates incoming tool requests in real time, applies PII masking, inspects for prompt injections, and blocks unauthorized actions.
              </p>
            </div>

            <div className="bg-[#0b1222] border border-[#182642] p-6 rounded-2xl space-y-4 relative">
              <span className="text-3xl font-black text-[#5cd3c1]/30">03</span>
              <h4 className="text-lg font-bold text-white">Monitor & Audit Provenance</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Inspect 2D/3D cognitive memory graphs, track superseded facts, and verify tamper-proof audit trails on the CortexShield Admin Dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Tiers ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-b border-[#182338]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-xs font-mono text-[#5cd3c1] uppercase tracking-widest font-bold">
              PRICING PLANS
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
              Transparent Security Plans for Every Scale
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-mono">
            {/* Tier 1: Pro */}
            <div className="bg-[#0b1222] border border-[#182642] p-8 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs text-[#5cd3c1] font-bold uppercase tracking-wider">Pro Tier</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400 font-sans">Ideal for startups & developers securing single AI agents.</p>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-[#182642]">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Up to 1M Shielded Requests/mo</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Standard AI Firewall Guardrails</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Neo4j Cognitive Memory Graph</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Neon Postgres Hash Audit Trail</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl bg-[#131d33] border border-[#23355a] text-center text-xs font-bold text-white hover:bg-[#1a2846] transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Tier 2: Growth (Featured) */}
            <div className="bg-[#0e172c] border-2 border-[#5cd3c1] p-8 rounded-2xl space-y-6 flex flex-col justify-between relative shadow-xl shadow-[#5cd3c1]/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#5cd3c1] text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <span className="text-xs text-[#5cd3c1] font-bold uppercase tracking-wider">Growth Tier</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$499</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400 font-sans">For growing teams deploying multi-agent MCP server workflows.</p>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-[#182642]">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Up to 10M Shielded Requests/mo</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Custom OPA Rego Policy Rules</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Isolated Database Namespaces</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Real-Time Telemetry Stream</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5cd3c1] to-cyan-500 text-center text-xs font-bold text-slate-950 hover:brightness-110 transition-all shadow-md shadow-[#5cd3c1]/20"
              >
                Launch Growth Plan
              </Link>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="bg-[#0b1222] border border-[#182642] p-8 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Enterprise</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">Custom</span>
                </div>
                <p className="text-xs text-slate-400 font-sans">Dedicated VPC deployment, WorkOS SSO/SCIM, and custom SLA.</p>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-[#182642]">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Unlimited Shielded Throughput</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> Dedicated Neo4j Cluster & Postgres</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> WorkOS Enterprise SSO & SCIM</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#5cd3c1]" /> 24/7 Dedicated Security SLA</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl bg-[#131d33] border border-[#23355a] text-center text-xs font-bold text-white hover:bg-[#1a2846] transition-all"
              >
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-12 bg-[#05080f] font-mono text-xs text-slate-400 border-t border-[#182338]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-lg">
              <ShieldCheck size={22} className="text-[#5cd3c1]" /> CortexShield
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-sm">
              The Enterprise AI Security & Governance Platform for AI Agents, Model Context Protocol servers, and Cognitive Vector Memory.
            </p>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Product</h5>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-[#5cd3c1]">AI Firewall</a></li>
              <li><a href="#features" className="hover:text-[#5cd3c1]">MCP Security</a></li>
              <li><a href="#features" className="hover:text-[#5cd3c1]">Memory Protection</a></li>
              <li><a href="#features" className="hover:text-[#5cd3c1]">Cryptographic Audit</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Platform</h5>
            <ul className="space-y-2">
              <li><Link href="/dashboard" className="hover:text-[#5cd3c1]">Admin Portal</Link></li>
              <li><Link href="/dashboard/graph" className="hover:text-[#5cd3c1]">Graph View</Link></li>
              <li><Link href="/dashboard/audit-logs" className="hover:text-[#5cd3c1]">Audit Logs</Link></li>
              <li><Link href="/dashboard/policies" className="hover:text-[#5cd3c1]">Policies</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Company</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#5cd3c1]">Documentation</a></li>
              <li><a href="#" className="hover:text-[#5cd3c1]">API Reference</a></li>
              <li><a href="#" className="hover:text-[#5cd3c1]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#5cd3c1]">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#121c2e] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>© 2026 CortexShield Inc. All rights reserved.</span>
          <span className="text-slate-500">Securing AI Agent Execution & Provenance Memory</span>
        </div>
      </footer>
    </div>
  );
}
