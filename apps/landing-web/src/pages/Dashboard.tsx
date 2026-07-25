import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bell, CreditCard, PlayCircle, ShieldCheck, Sparkles, User, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useOverview } from '../hooks/useOverview';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUsage } from '../hooks/useUsage';

const quickLinks = [
  { label: 'Security', to: '/security-workspace', description: 'Review trust controls and audit logs', icon: ShieldCheck },
  { label: 'Cognitive Graph', to: '/graph', description: 'Inspect memory context relationships', icon: Activity }
];

export const Dashboard: React.FC = () => {
  const { data, isLoading } = useOverview('24h');
  const { data: usage } = useUsage();
  const { status: wsStatus } = useWebSocket();

  const isWsConnected = wsStatus === 'open';

  const overviewCards = [
    { label: 'Shielded requests', value: data?.metrics.shieldedRequests || '-', tone: 'text-emerald-300' },
    { label: 'Blocked threats', value: data?.metrics.blockedThreats || '-', tone: 'text-rose-300' },
    { label: 'Memory nodes', value: data?.metrics.nodesSynced || '-', tone: 'text-indigo-300' },
    { label: 'High severity', value: data?.metrics.highSeverityInjections?.toString() || '-', tone: 'text-amber-300' }
  ];

  return (
    <WorkspaceShell
      title="Overview"
      description="A premium control center for your account, AI agents, connectors, security posture, and deployment operations."
      badge="Welcome back"
      action={<Link to="/profile" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"><User className="h-4 w-4" />Manage profile</Link>}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/75 p-6 shadow-2xl shadow-indigo-950/10 relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10">
                <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
              </div>
            )}
            
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Account status</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">Your AI ecosystem is running smoothly</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  {data?.metrics?.enforcedPolicies || 0} policies enforced, memory integrity at {data?.metrics?.memoryIntegrity || '100%'}, and latency holding steady at {data?.metrics?.latencyMs || 0}ms.
                </p>
              </div>
              <div className={`flex items-center gap-2 rounded-[1.5rem] border px-4 py-3 text-sm font-semibold transition-colors ${isWsConnected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                {isWsConnected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {isWsConnected ? 'Live Updates Active' : 'Connecting...'}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <div key={card.label} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className={`mt-3 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="rounded-[1.75rem] border border-white/10 bg-[#111827]/70 p-5 transition hover:border-indigo-500/30 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><Icon className="h-5 w-5" /></div>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{item.label}</p>
                <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10">
              <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          )}
          <div className="flex items-center gap-2 text-indigo-300">
            <Bell className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Latest activity</p>
          </div>
          <div className="mt-5 space-y-3">
            {data?.liveLogs && data.liveLogs.length > 0 ? data.liveLogs.map((log, idx) => (
              <div key={idx} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{log.type.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs text-slate-400">{log.rule}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.color}`}>{log.status}</span>
                  <p className="mt-2 text-xs text-slate-500">{log.time}</p>
                </div>
              </div>
            )) : (
              <div className="p-4 text-sm text-slate-500 text-center">No recent activity</div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <CreditCard className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Plan & spend</p>
          </div>
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-5">
            <p className="text-sm text-slate-400">Current plan</p>
            <p className="mt-3 text-3xl font-semibold text-white">Scale Tier</p>
            <p className="mt-2 text-sm text-slate-400">
              {usage?.isOverlimit ? (
                <span className="text-rose-400 font-semibold">Over tier limit! {usage?.overageAmount} overage</span>
              ) : (
                <>{usage?.remainingCredits} credits remaining this month</>
              )}
            </p>
            <Link to="/billing" className="mt-5 inline-block rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">View billing</Link>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
  );
};
