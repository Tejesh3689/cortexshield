"use client";

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, ExternalLink, WifiOff, Terminal, Sparkles } from "lucide-react";

// 1. Skeleton Loader Component
export function SkeletonLoader({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 w-full font-mono animate-pulse">
      <div className="h-10 bg-[#131b2e] rounded-xl border border-[#1b273d]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-[#0e1424] rounded-2xl border border-[#1b273d]" />
        <div className="h-24 bg-[#0e1424] rounded-2xl border border-[#1b273d]" />
        <div className="h-24 bg-[#0e1424] rounded-2xl border border-[#1b273d]" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-[#0e1424]/90 rounded-xl border border-[#1b273d]" />
      ))}
    </div>
  );
}

// 2. Error Banner Component
export function ErrorBanner({
  message = "Unable to load telemetry — retrying in 5s",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-300 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={18} className="text-red-400 shrink-0 animate-bounce" />
        <span className="font-bold">{message}</span>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-white font-bold rounded-xl border border-red-600/50 transition-all flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={13} />
          <span>Retry Now</span>
        </button>
      )}
    </div>
  );
}

// 3. Empty State / Onboarding Prompt Component
export function EmptyStatePrompt({
  title = "Connect your first AI agent to get started",
  description = "No telemetry recorded yet. Add CortexShield to your agent's MCP configuration file.",
}: {
  title?: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  const mcpCode = JSON.stringify(
    {
      mcpServers: {
        cortexshield: {
          url: "http://localhost:8200/mcp",
          headers: { Authorization: "Bearer your_tenant_api_key" },
        },
      },
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-6 md:p-8 bg-[#0e1424]/90 border border-[#1b273d] rounded-2xl space-y-5 font-mono text-xs shadow-2xl text-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#5cd3c1]/10 text-[#5cd3c1] border border-[#5cd3c1]/30">
              <Sparkles size={18} />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
          </div>
          <p className="text-slate-400 text-xs">{description}</p>
        </div>

        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white rounded-xl flex items-center gap-1.5 transition-all text-xs shrink-0"
        >
          <span>View Documentation</span>
          <ExternalLink size={13} />
        </a>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-[#5cd3c1]">
            <Terminal size={14} /> Add to your mcp.json file:
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[#5cd3c1] hover:underline"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy Snippet"}</span>
          </button>
        </div>

        <pre className="p-4 bg-[#080d1a] border border-[#172238] rounded-xl text-emerald-400 text-[11px] leading-relaxed overflow-x-auto select-text font-mono">
          {mcpCode}
        </pre>
      </div>
    </div>
  );
}

// 4. Offline Reconnecting Banner Component
export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;

  return (
    <div className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-xl text-amber-300 font-mono text-xs font-bold flex items-center justify-between shadow-lg animate-pulse mb-4">
      <div className="flex items-center gap-2">
        <WifiOff size={16} className="text-amber-400 shrink-0" />
        <span>Offline — reconnecting to proxy-engine every 10s...</span>
      </div>
      <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded text-amber-300">
        AUTO-RETRYING
      </span>
    </div>
  );
}
