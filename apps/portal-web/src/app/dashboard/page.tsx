"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Brain,
  Zap,
  TrendingUp,
  BarChart3,
  FileText,
  Radio,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Lock,
  ChevronRight,
  Database
} from "lucide-react";

interface OverviewMetrics {
  shieldedRequests: string;
  shieldedRequestsGrowth: string;
  blockedThreats: string;
  highSeverityInjections: number;
  memoryIntegrity: string;
  nodesSynced: string;
  enforcedPolicies: string;
  activeRulesText: string;
  latencyMs: string;
}

interface ChartBar {
  time: string;
  val: number;
  threat: boolean;
}

interface LogEvent {
  status: string;
  type: string;
  ip: string;
  rule: string;
  time: string;
  color: string;
}

interface ThreatVector {
  label: string;
  pct: number;
  color: string;
  textColor: string;
}

export default function DashboardOverview() {
  const [timeframe, setTimeframe] = useState("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbSource, setDbSource] = useState("Loading Telemetry...");

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    shieldedRequests: "4,892,104",
    shieldedRequestsGrowth: "+14.2%",
    blockedThreats: "1,284",
    highSeverityInjections: 12,
    memoryIntegrity: "98.4%",
    nodesSynced: "1,420",
    enforcedPolicies: "24 / 24",
    activeRulesText: "PII & Provenance Active",
    latencyMs: "3.8ms",
  });

  const [chartData, setChartData] = useState<ChartBar[]>([
    { time: "00:00", val: 35, threat: false },
    { time: "02:00", val: 50, threat: false },
    { time: "04:00", val: 28, threat: false },
    { time: "06:00", val: 85, threat: true },
    { time: "08:00", val: 40, threat: false },
    { time: "10:00", val: 65, threat: false },
    { time: "12:00", val: 95, threat: true },
    { time: "14:00", val: 45, threat: false },
    { time: "16:00", val: 75, threat: false },
    { time: "18:00", val: 30, threat: false },
    { time: "20:00", val: 60, threat: false },
    { time: "22:00", val: 90, threat: true },
  ]);

  const [liveLogs, setLiveLogs] = useState<LogEvent[]>([
    {
      status: "BLOCKED",
      type: "PROMPT_INJECTION",
      ip: "192.168.0.254",
      rule: "PR-INJ-009",
      time: "Just now",
      color: "border-red-500/40 text-red-400 bg-red-950/20",
    },
    {
      status: "SANITIZED",
      type: "PII_LEAK_MASKED",
      ip: "172.16.0.42",
      rule: "PII-MASK-SSN",
      time: "2 mins ago",
      color: "border-amber-500/40 text-amber-400 bg-amber-950/20",
    },
    {
      status: "QUARANTINED",
      type: "POISONED_MEMORY_CHUNK",
      ip: "10.0.0.18",
      rule: "MEM-INTEG-04",
      time: "5 mins ago",
      color: "border-purple-500/40 text-[#737ccf] bg-purple-950/20",
    },
    {
      status: "VERIFIED",
      type: "PROVENANCE_PASSED",
      ip: "10.0.0.1",
      rule: "CYPHER-OK-200",
      time: "8 mins ago",
      color: "border-[#5cd3c1]/40 text-[#5cd3c1] bg-[#5cd3c1]/10",
    },
  ]);

  const [threatVectors, setThreatVectors] = useState<ThreatVector[]>([
    { label: "Prompt Injection Attacks", pct: 48, color: "bg-red-400", textColor: "text-red-400" },
    { label: "PII / Secret Data Leakage", pct: 26, color: "bg-amber-400", textColor: "text-amber-400" },
    { label: "Vector Memory Poisoning", pct: 16, color: "bg-[#737ccf]", textColor: "text-purple-400" },
    { label: "Malformed Tool Payload", pct: 10, color: "bg-cyan-400", textColor: "text-cyan-400" },
  ]);

  const fetchOverviewData = useCallback(async (selectedTimeframe: string) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/overview?timeframe=${selectedTimeframe}`);
      if (!res.ok) throw new Error("Failed to fetch overview data");
      const data = await res.json();

      if (data.success) {
        if (data.metrics) setMetrics(data.metrics);
        if (data.chartData) setChartData(data.chartData);
        if (data.liveLogs) setLiveLogs(data.liveLogs);
        if (data.threatVectors) setThreatVectors(data.threatVectors);
        setDbConnected(data.isDbConnected ?? true);
        setDbSource(data.dbSource || "Neon Postgres & Neo4j Aura");
      }
    } catch (err) {
      console.error("Overview data load error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData(timeframe);
    const interval = setInterval(() => {
      fetchOverviewData(timeframe);
    }, 15000);
    return () => clearInterval(interval);
  }, [timeframe, fetchOverviewData]);

  const handleRefresh = () => {
    fetchOverviewData(timeframe);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#090d16] min-h-screen text-slate-100 font-sans select-none">
      {/* Top Header & Defense Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1b273d] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5cd3c1]/10 border border-[#5cd3c1]/30 text-[#5cd3c1]">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
                CORTEXSHIELD OVERVIEW
              </h1>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                AI Firewall & System Provenance Security Intelligence Hub
                {dbConnected && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <Database size={10} /> Live Backend Connected
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-3 font-mono">
          <div className="flex items-center gap-2 bg-[#0e1424] border border-[#1b273d] px-3.5 py-2 rounded-xl text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5cd3c1] animate-pulse" />
            <span className="text-slate-400">SHIELD STATUS:</span>
            <span className="text-[#5cd3c1] font-bold">ACTIVE & OPTIMAL</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0e1424] border border-[#1b273d] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">LATENCY:</span>
            <span className="text-cyan-400 font-bold">{metrics.latencyMs}</span>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#0e1424] p-1 rounded-xl border border-[#1b273d]">
            {["24h", "7d", "30d"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  timeframe === t
                    ? "bg-[#1b273d] text-[#5cd3c1] font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-[#0e1424] border border-[#1b273d] text-slate-300 hover:text-white transition-all hover:border-[#5cd3c1]/40"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-[#5cd3c1]" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono">
        {/* Card 1: Shielded Requests */}
        <div className="bg-[#0e1424]/90 border border-[#1b273d] p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#5cd3c1]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Shielded Requests</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Zap size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{metrics.shieldedRequests}</h3>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> {metrics.shieldedRequestsGrowth} from previous {timeframe}
            </p>
          </div>
          <div className="w-full bg-[#172238] h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full w-[85%]" />
          </div>
        </div>

        {/* Card 2: Blocked Threats */}
        <div className="bg-[#0e1424]/90 border border-[#1b273d] p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-red-500/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Blocked Threats</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{metrics.blockedThreats}</h3>
            <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
              <ShieldAlert size={12} /> {metrics.highSeverityInjections} High Severity Injections
            </p>
          </div>
          <div className="w-full bg-[#172238] h-1.5 rounded-full overflow-hidden">
            <div className="bg-red-400 h-full w-[24%]" />
          </div>
        </div>

        {/* Card 3: Memory Graph Integrity */}
        <div className="bg-[#0e1424]/90 border border-[#1b273d] p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#737ccf]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Memory Integrity</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-[#737ccf]">
              <Brain size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{metrics.memoryIntegrity}</h3>
            <p className="text-[11px] text-[#737ccf] flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} /> {metrics.nodesSynced} Nodes Synced
            </p>
          </div>
          <div className="w-full bg-[#172238] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#737ccf] h-full w-[98.4%]" />
          </div>
        </div>

        {/* Card 4: Active Policies */}
        <div className="bg-[#0e1424]/90 border border-[#1b273d] p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#5cd3c1]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Enforced Policies</span>
            <div className="p-2 rounded-lg bg-[#5cd3c1]/10 text-[#5cd3c1]">
              <Lock size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{metrics.enforcedPolicies}</h3>
            <p className="text-[11px] text-[#5cd3c1] flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} /> {metrics.activeRulesText}
            </p>
          </div>
          <div className="w-full bg-[#172238] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#5cd3c1] h-full w-[100%]" />
          </div>
        </div>
      </div>

      {/* Main Section Grid: Threat Activity & Security Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Real-Time Threat Stream & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Threat Interception Volume Chart Box */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-6 space-y-5 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#5cd3c1]" /> AI Firewall Threat Interception Stream
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time blocked prompt attacks & PII leaks</p>
              </div>
              <span className="text-xs text-[#5cd3c1] bg-[#5cd3c1]/10 border border-[#5cd3c1]/20 px-3 py-1 rounded-full font-bold">
                LIVE TELEMETRY
              </span>
            </div>

            {/* Visual Bar Graph Stream */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#172238]">
              {chartData.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div
                    className={`w-full rounded-t-md transition-all group-hover:brightness-125 ${
                      bar.threat
                        ? "bg-gradient-to-t from-red-600 to-red-400 shadow-sm shadow-red-500/50"
                        : "bg-gradient-to-t from-[#1b273d] to-[#5cd3c1]"
                    }`}
                    style={{ height: `${bar.val}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{bar.time}</span>
                </div>
              ))}
            </div>

            {/* Legend & Summary Footer */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#5cd3c1]" /> Normal Request Passes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500" /> Blocked Threat Spikes
                </span>
              </div>
              <span className="text-slate-300 font-bold">Peak Overhead: {metrics.latencyMs}</span>
            </div>
          </div>

          {/* Live Security Event Stream Feed */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#172238] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Radio size={16} className="text-[#5cd3c1] animate-pulse" /> Live Security Log Ticker
              </h3>
              <Link href="/dashboard/audit-logs" className="text-xs text-[#5cd3c1] hover:underline flex items-center gap-1">
                View All Provenance Logs <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {liveLogs.map((ev, i) => (
                <div
                  key={i}
                  className="bg-[#070a12] border border-[#172238] p-3 rounded-xl flex items-center justify-between hover:border-[#202e48] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${ev.color}`}>
                      {ev.status}
                    </span>
                    <div>
                      <p className="font-bold text-white">{ev.type}</p>
                      <p className="text-[10px] text-slate-400">
                        Rule: <span className="text-cyan-400">{ev.rule}</span> | IP: {ev.ip}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px]">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: System Modules Quick Navigation & Risk Distribution */}
        <div className="space-y-6 font-mono">
          {/* Quick System Navigation Cards */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-[#172238] pb-3">
              CortexShield Modules
            </h3>

            <div className="space-y-3">
              {/* Module 1: Memory Graph */}
              <Link
                href="/dashboard/graph"
                className="block p-3.5 rounded-xl bg-[#131b2e] border border-[#202e48] hover:border-[#5cd3c1] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#5cd3c1]/10 text-[#5cd3c1]">
                      <Brain size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#5cd3c1] transition-colors">
                        Memory Graph View
                      </h4>
                      <p className="text-[10px] text-slate-400">Teal & Purple 2D/3D Memory Index</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-500 group-hover:text-[#5cd3c1] transition-colors" />
                </div>
              </Link>

              {/* Module 2: Audit Logs */}
              <Link
                href="/dashboard/audit-logs"
                className="block p-3.5 rounded-xl bg-[#131b2e] border border-[#202e48] hover:border-[#5cd3c1] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        System Provenance Audit Logs
                      </h4>
                      <p className="text-[10px] text-slate-400">Immutable Cryptographic Log Feed</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </Link>

              {/* Module 3: Policy Editor */}
              <Link
                href="/dashboard/policies"
                className="block p-3.5 rounded-xl bg-[#131b2e] border border-[#202e48] hover:border-[#5cd3c1] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-[#737ccf]">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#737ccf] transition-colors">
                        Policy Matrix & Guardrails
                      </h4>
                      <p className="text-[10px] text-slate-400">24 Active Protection Rules</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-500 group-hover:text-[#737ccf] transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Risk Vector Breakdown Box */}
          <div className="bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-[#172238] pb-3">
              Threat Vector Distribution
            </h3>

            <div className="space-y-3 text-xs">
              {threatVectors.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between py-1 text-slate-300">
                    <span>{item.label}</span>
                    <span className={`font-bold ${item.textColor}`}>{item.pct}%</span>
                  </div>
                  <div className="w-full bg-[#172238] h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
