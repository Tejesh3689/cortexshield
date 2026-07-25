import React from 'react';
import { Bell, ChevronRight, ShieldAlert, Zap, RefreshCw } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useWebSocket } from '../hooks/useWebSocket';

export const Notifications: React.FC = () => {
  const { data, isLoading } = useAuditLogs();
  const { status: wsStatus } = useWebSocket();

  return (
  <WorkspaceShell
    title="Notifications"
    description="Keep tabs on security, product updates, deployments, and account events from a polished activity feed."
    badge="Activity feed"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Mark all read</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <div className="flex items-center gap-2 text-indigo-300">
          <Bell className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em]">Channels</p>
        </div>
        <div className="mt-5 space-y-3">
          {['Security', 'Billing', 'Deployments', 'Product'].map((topic) => (
            <div key={topic} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3 text-sm text-slate-400">
              <span>{topic}</span>
              <span className="font-semibold text-white">Enabled</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6 relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[2rem]">
            <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
          </div>
        )}
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Recent updates</p>
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2 w-2 ${wsStatus === 'open' ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full`}>
              {wsStatus === 'open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">{wsStatus === 'open' ? 'Live' : 'Connecting'}</span>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {data?.logs && data.logs.length > 0 ? data.logs.map((item) => (
            <div key={item.id} className="flex items-start justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><ShieldAlert className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.event_type.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm text-slate-400 font-mono text-[10px] truncate max-w-[300px]">{item.event_ref}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Security</p>
                <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-slate-500 bg-white/5 border border-white/5 rounded-2xl">
              No recent notifications
            </div>
          )}
        </div>
      </div>
    </div>
  </WorkspaceShell>
  );
};