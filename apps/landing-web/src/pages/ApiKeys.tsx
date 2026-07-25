import React from 'react';
import { Copy, KeyRound, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const keys = [
  { name: 'Production', prefix: 'sk_live_...', created: 'Apr 12, 2026', lastUsed: '2 min ago', status: 'Active' },
  { name: 'Development', prefix: 'sk_dev_...', created: 'Apr 08, 2026', lastUsed: '1 hr ago', status: 'Active' },
  { name: 'Sandbox', prefix: 'sk_sbx_...', created: 'Mar 30, 2026', lastUsed: '2 days ago', status: 'Revoked' }
];

export const ApiKeys: React.FC = () => (
  <WorkspaceShell
    title="API Keys"
    description="Securely manage production, development, and sandbox credentials with clear usage and lifecycle controls."
    badge="Access management"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Create key</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <div className="flex items-center gap-2 text-indigo-300">
          <ShieldCheck className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em]">Permissions</p>
        </div>
        <div className="mt-5 space-y-4">
          {['Read access to connectors', 'Write access to deployments', 'Manage agent lifecycle', 'Audit secure event logs'].map((permission) => (
            <div key={permission} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4 text-sm text-slate-400">{permission}</div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Key inventory</p>
        <div className="mt-5 space-y-4">
          {keys.map((key) => (
            <div key={key.name} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><KeyRound className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">{key.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{key.prefix}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${key.status === 'Active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{key.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                <span>Created {key.created}</span>
                <span>Last used {key.lastUsed}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"><Copy className="mr-2 inline h-4 w-4" />Copy</button>
                <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"><RefreshCcw className="mr-2 inline h-4 w-4" />Rotate</button>
                <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"><Trash2 className="mr-2 inline h-4 w-4" />Revoke</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </WorkspaceShell>
);