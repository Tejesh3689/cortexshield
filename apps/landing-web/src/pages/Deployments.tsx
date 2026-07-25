import React from 'react';
import { Activity, ArrowUpRight, Cpu, HardDrive, PlayCircle, PauseCircle, Trash2 } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const deployments = [
  { name: 'Production Gateway', environment: 'prod', status: 'Running', cpu: '42%', memory: '61%', latency: '63ms', version: 'v4.2.3' },
  { name: 'Research Cluster', environment: 'staging', status: 'Scaling', cpu: '78%', memory: '74%', latency: '109ms', version: 'v4.2.2' },
  { name: 'Support MCP', environment: 'dev', status: 'Paused', cpu: '14%', memory: '26%', latency: '31ms', version: 'v4.1.9' }
];

export const Deployments: React.FC = () => (
  <WorkspaceShell
    title="Deployments"
    description="Track your live environments, health metrics, and rollout state from one clear control center."
    badge="Runtime operations"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Create deployment</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Live health</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">3 active release tracks</h2>
        <div className="mt-6 space-y-4">
          {deployments.map((item) => (
            <div key={item.name} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.environment.toUpperCase()} · {item.version}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{item.status}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400"><span className="block text-[10px] uppercase tracking-[0.32em]">CPU</span><span className="mt-1 block text-white">{item.cpu}</span></div>
                <div className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400"><span className="block text-[10px] uppercase tracking-[0.32em]">Memory</span><span className="mt-1 block text-white">{item.memory}</span></div>
                <div className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400"><span className="block text-[10px] uppercase tracking-[0.32em]">Latency</span><span className="mt-1 block text-white">{item.latency}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Activity className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Release timeline</p>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['Rolling update to gateway', '4m ago', 'Completed'],
              ['Scale event triggered', '23m ago', 'Running'],
              ['Paused MCP worker', '1h ago', 'Alert']
            ].map(([title, time, state]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">{state}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Quick actions</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Restart', icon: PlayCircle },
              { label: 'Pause', icon: PauseCircle },
              { label: 'Inspect logs', icon: Activity },
              { label: 'Remove', icon: Trash2 }
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} className="flex items-center justify-center gap-2 rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
                  <Icon className="h-4 w-4" />{action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
);
