import React from 'react';
import { Activity, BrainCircuit, Cpu, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { initialAgents } from '../mockData';

export const Agents: React.FC = () => (
  <WorkspaceShell
    title="AI Agents"
    description="Every deployed agent is treated as a living service with health, usage, and performance telemetry."
    badge="Deployed agents"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Deploy new agent</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <div className="flex items-center gap-2 text-indigo-300">
          <BrainCircuit className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em]">Fleet overview</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ['Active agents', '9'],
            ['Avg. health', '96.4%'],
            ['Requests today', '64.2k'],
            ['Tools connected', '42']
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Performance trend</p>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">+14.3%</span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            {[42, 58, 63, 72, 80, 91].map((height, index) => (
              <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-indigo-600 to-cyan-400" style={{ height: `${height}px` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {initialAgents.map((agent) => (
          <div key={agent.id} className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><Cpu className="h-5 w-5" /></span>
                  <div>
                    <p className="text-base font-semibold text-white">{agent.name}</p>
                    <p className="text-sm text-slate-400">{agent.department}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-400">{agent.description}</p>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{agent.status}</div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Model</p>
                <p className="mt-2 text-sm font-semibold text-white">{agent.model}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Usage</p>
                <p className="mt-2 text-sm font-semibold text-white">{agent.requests.toLocaleString()} req</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Health</p>
                <p className="mt-2 text-sm font-semibold text-white">{agent.health}%</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1"><Zap className="h-3.5 w-3.5" />{agent.lastActive}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1"><TrendingUp className="h-3.5 w-3.5" />{agent.successRate}% success</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1"><Activity className="h-3.5 w-3.5" />{(agent.tokensUsed / 1000000).toFixed(1)}M tokens</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </WorkspaceShell>
);
