import React, { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, ServerCog, Activity, ArrowUpRight, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const connectors = [
  { name: 'OpenAI', category: 'Models', status: 'Connected', health: 'Healthy', version: 'v1.8.2', lastSync: '2 min ago', latency: '88ms', usage: '18.2k req', accent: 'from-sky-500/20 to-cyan-500/10' },
  { name: 'Anthropic', category: 'Models', status: 'Connected', health: 'Healthy', version: 'v0.9.1', lastSync: '6 min ago', latency: '112ms', usage: '9.4k req', accent: 'from-fuchsia-500/20 to-violet-500/10' },
  { name: 'Google Gemini', category: 'Models', status: 'Warning', health: 'Warning', version: 'v2.0.4', lastSync: '24 min ago', latency: '220ms', usage: '7.1k req', accent: 'from-emerald-500/20 to-lime-500/10' },
  { name: 'GitHub', category: 'Dev Tools', status: 'Connected', health: 'Healthy', version: 'v4.7.0', lastSync: '1 min ago', latency: '44ms', usage: '5.6k req', accent: 'from-slate-500/20 to-zinc-500/10' },
  { name: 'Slack', category: 'Workflows', status: 'Connected', health: 'Healthy', version: 'v3.4.1', lastSync: '9 min ago', latency: '63ms', usage: '4.2k req', accent: 'from-purple-500/20 to-indigo-500/10' },
  { name: 'PostgreSQL', category: 'Data', status: 'Disconnected', health: 'Offline', version: 'v15.4', lastSync: '2 hrs ago', latency: '—', usage: '1.8k req', accent: 'from-amber-500/20 to-orange-500/10' }
];

export const Connectors: React.FC = () => {
  const [query, setQuery] = useState('');
  const filteredConnectors = useMemo(() => connectors.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <WorkspaceShell
      title="Connectors"
      description="Bring your AI ecosystem together with reliable, health-monitored connectors for models, data sources, and collaboration tools."
      badge="Connected services"
      action={[
        <button key="add" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"><Plus className="h-4 w-4" />Add Connector</button>,
        <button key="inspect" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">Inspect health</button>
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Managed connectors</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">High-confidence integrations</h2>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">24 active</div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1220]/70 px-4 py-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-slate-200 outline-none" placeholder="Search connectors" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredConnectors.map((item) => {
              const statusColor = item.status === 'Connected' ? 'text-emerald-300' : item.status === 'Warning' ? 'text-amber-300' : 'text-rose-300';
              return (
                <div key={item.name} className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-5">
                  <div className={`rounded-2xl bg-gradient-to-br ${item.accent} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"><ServerCog className="h-5 w-5" /></div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor}`}>
                        {item.status === 'Connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.status === 'Warning' ? <AlertTriangle className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.category}</p>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-400">
                    <div className="flex items-center justify-between"><span>Health</span><span className="font-semibold text-white">{item.health}</span></div>
                    <div className="flex items-center justify-between"><span>Version</span><span className="font-semibold text-white">{item.version}</span></div>
                    <div className="flex items-center justify-between"><span>Last sync</span><span className="font-semibold text-white">{item.lastSync}</span></div>
                    <div className="flex items-center justify-between"><span>Latency</span><span className="font-semibold text-white">{item.latency}</span></div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="text-slate-400">Usage</span>
                    <span className="font-semibold text-white">{item.usage}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.32em]">Live health map</p>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ['Models', '99.2%', 'Stable'],
                ['Workflows', '95.8%', 'Stable'],
                ['Data', '88.6%', 'Watch'],
                ['Security', '97.1%', 'Stable']
              ].map(([label, value, state]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-400"><span>{label}</span><span className="text-white">{value}</span></div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: value }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{state}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Recent activity</p>
            <div className="mt-5 space-y-4">
              {[
                ['Slack sync', 'Completed 14 mins ago', 'Healthy'],
                ['Notion import', 'Queued 1 hour ago', 'Pending'],
                ['Gemini latency', 'Raised 2 hours ago', 'Watch']
              ].map(([title, time, status]) => (
                <div key={title} className="flex items-start justify-between rounded-2xl border border-white/10 bg-[#0B1220]/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-400">{time}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};
