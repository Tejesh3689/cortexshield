import React from 'react';
import { BookOpen, ChevronRight, MessageSquareText, LifeBuoy } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const tickets = [
  { id: '#T-420', issue: 'Connector sync delay', priority: 'High', status: 'In progress' },
  { id: '#T-417', issue: 'Billing export request', priority: 'Medium', status: 'Resolved' },
  { id: '#T-409', issue: 'Agent deployment rollback', priority: 'Urgent', status: 'Queued' }
];

export const Support: React.FC = () => (
  <WorkspaceShell
    title="Support"
    description="Resolve issues quickly with structured tickets, knowledge base articles, and guided support workflows."
    badge="Live support"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Create ticket</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Open tickets</p>
        <div className="mt-5 space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div>
                <p className="text-sm font-semibold text-white">{ticket.issue}</p>
                <p className="mt-1 text-sm text-slate-400">{ticket.id}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">{ticket.priority}</span>
                <p className="mt-2 text-sm text-slate-400">{ticket.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <BookOpen className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Knowledge base</p>
          </div>
          <div className="mt-5 space-y-3">
            {['Connector diagnostics', 'Agent deployment checklist', 'Billing reconciliation guide'].map((item) => (
              <button key={item} className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5">
                <span>{item}</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <MessageSquareText className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Live help</p>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-5 text-sm text-slate-400">
            <div className="flex items-center gap-2 text-white"><LifeBuoy className="h-4 w-4" /> Priority support is available 24/7 for enterprise accounts.</div>
            <p className="mt-3">A specialist joins your queue within 2 minutes during business hours.</p>
            <button className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Open live chat</button>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
);