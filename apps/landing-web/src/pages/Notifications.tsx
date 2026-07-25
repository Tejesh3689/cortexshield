import React from 'react';
import { Bell, ChevronRight, ShieldAlert, Zap } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const activity = [
  { title: 'Security alert resolved', detail: 'A suspicious token pattern was isolated and blocked.', time: '2 min ago', type: 'Security' },
  { title: 'New deployment available', detail: 'Gateway v4.2.3 is running on production.', time: '18 min ago', type: 'Deployments' },
  { title: 'Connector sync completed', detail: 'Slack and Notion synced without errors.', time: '1 hr ago', type: 'Connectors' }
];

export const Notifications: React.FC = () => (
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

      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Recent updates</p>
        <div className="mt-5 space-y-4">
          {activity.map((item) => (
            <div key={item.title} className="flex items-start justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><ShieldAlert className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.type}</p>
                <p className="mt-2 text-sm text-slate-400">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </WorkspaceShell>
);