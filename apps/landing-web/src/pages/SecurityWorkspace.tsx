import React from 'react';
import { AlertTriangle, ShieldCheck, Lock, Radar, TerminalSquare, Activity, RefreshCw } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useOverview } from '../hooks/useOverview';
import { useAuditLogs } from '../hooks/useAuditLogs';

export const SecurityWorkspace: React.FC = () => {
  const { data: overview, isLoading: overviewLoading } = useOverview('24h');
  const { data: auditData, isLoading: auditLoading } = useAuditLogs();

  const securityCards = [
    { label: 'Overall score', value: overview ? '97/100' : '-', detail: 'Excellent posture' },
    { label: 'Threat detections', value: overview?.metrics.blockedThreats || '-', detail: 'Blocked today' },
    { label: 'Prompt injection', value: overview?.metrics.highSeverityInjections.toString() || '-', detail: overview?.metrics.highSeverityInjections ? 'Incidents logged' : 'No active incidents' },
    { label: 'Policies', value: overview?.metrics.enforcedPolicies || '-', detail: 'Fully aligned' }
  ];

  return (
  <WorkspaceShell
    title="Security Center"
    description="Monitor the health of your organization’s trust layer with live risk signals, controls, and policy coverage."
    badge="Protected operations"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Review policy</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Risk overview</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Enterprise-grade protection</h2>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Secure</div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {securityCards.map((card) => (
              <div key={card.label} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6 relative min-h-[300px]">
          {auditLoading && (
            <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[2rem]">
              <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          )}
          <div className="flex items-center gap-2 text-indigo-300">
            <Radar className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Threat activity</p>
          </div>
          <div className="mt-5 space-y-4">
            {auditData?.logs && auditData.logs.length > 0 ? auditData.logs.slice(0, 5).map((event) => {
              const isHighRisk = event.event_type.includes('INJECTION') || event.event_type.includes('POISON');
              return (
                <div key={event.id} className="flex items-start justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{event.event_type}</p>
                    <p className="mt-1 text-sm text-slate-400 font-mono text-[10px] truncate max-w-[250px]">{event.event_ref}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isHighRisk ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/10 text-slate-300'}`}>
                    {isHighRisk ? 'High' : 'Info'}
                  </span>
                </div>
              );
            }) : (
              <div className="p-4 text-center text-sm text-slate-500 border border-white/5 bg-white/5 rounded-2xl">No recent threats logged</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Control plane</p>
          </div>
          <div className="mt-5 space-y-5">
            {[
              ['Prompt injection defense', 'Enabled', 'Active'],
              ['Sensitive data shielding', 'Enabled', 'Active'],
              ['MFA enforcement', 'Required', 'Active'],
              ['Zero-trust gateway', 'Operational', 'Healthy']
            ].map(([label, value, status]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Activity className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Recommendations</p>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['Rotate legacy access token', 'High priority'],
              ['Enable geo-fencing for admin access', 'Medium priority'],
              ['Review weekly usage anomalies', 'Low priority']
            ].map(([line, priority]) => (
              <div key={line} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  <p className="text-sm text-slate-200">{line}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
  );
};

