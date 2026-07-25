import React from 'react';
import { CreditCard, Download, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useUsage } from '../hooks/useUsage';

const invoices = [
  { id: 'INV-2407', date: 'Jul 12, 2026', amount: '$1,280.00', status: 'Paid' },
  { id: 'INV-2406', date: 'Jun 12, 2026', amount: '$1,280.00', status: 'Paid' },
  { id: 'INV-2405', date: 'May 12, 2026', amount: '$1,280.00', status: 'Pending' }
];

export const Billing: React.FC = () => {
  const { data, isLoading } = useUsage();

  return (
    <>
      {data?.isOverlimit && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#111827] border border-rose-500/50 p-8 rounded-2xl max-w-md text-center shadow-2xl shadow-rose-900/20">
            <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Usage Limit Exceeded</h2>
            <p className="text-slate-400 mb-6">
              Your Scale Tier credits have been exhausted for this billing period (Overage: {data.overageAmount}). Please upgrade your plan or purchase additional credits to restore full functionality.
            </p>
            <button 
              className="bg-indigo-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-indigo-500 transition"
              onClick={() => window.alert('Redirecting to upgrade checkout...')}
            >
              View Upgrade Options
            </button>
          </div>
        </div>
      )}
  <WorkspaceShell
    title="Billing"
    description="Track plan usage, payments, invoices, and renewal details in a polished billing console."
    badge="Plan overview"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Upgrade plan</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <CreditCard className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Current plan</p>
          </div>
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-6">
            <p className="text-sm text-slate-400">Scale</p>
            <p className="mt-3 text-3xl font-semibold text-white">$1,280 / month</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">Includes 2M AI requests, enterprise support, advanced security, and priority connector sync.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Manage payment</button>
              <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300">Download invoice</button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[2rem]">
              <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Usage snapshot</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Credits', data ? `${data.remainingCredits} remaining` : '-'],
              ['Requests', data ? `${data.requestsThisMonth} this month` : '-'],
              ['Overage', data?.isOverlimit ? <span className="text-rose-400">{data.overageAmount}</span> : '$0.00']
            ].map(([label, value], idx) => (
              <div key={idx} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-3 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Invoice history</p>
          </div>
          <div className="mt-5 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-4 text-sm">
                <div>
                  <p className="font-semibold text-white">{invoice.id}</p>
                  <p className="mt-1 text-slate-400">{invoice.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{invoice.amount}</p>
                  <p className="mt-1 text-slate-400">{invoice.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Download className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Payment method</p>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-5 text-sm text-slate-400">
            <p className="font-semibold text-white">Visa ending in 4242</p>
            <p className="mt-2">Auto-renews on August 12, 2026.</p>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
  </>
  );
};