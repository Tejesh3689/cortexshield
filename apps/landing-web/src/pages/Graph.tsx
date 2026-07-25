import React from 'react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useGraph } from '../hooks/useGraph';
import { Network, ServerCrash, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const Graph: React.FC = () => {
  const { data, isLoading, healEdge } = useGraph();

  // Find a poisoned edge to demonstrate the heal button
  const poisonedEdge = data?.graph?.edges?.find(e => e.properties?.status === 'FLAGGED_POISON');

  const totalNodes = data?.graph?.nodes?.length || 0;
  const totalEdges = data?.graph?.edges?.length || 0;
  const poisonedCount = data?.graph?.edges?.filter(e => e.properties?.status === 'FLAGGED_POISON').length || 0;

  return (
    <WorkspaceShell
      title="Cognitive Graph"
      description="Inspect memory context relationships and resolve AI contradictions securely."
      badge="Neo4j Graph Integration"
      action={<button onClick={() => window.location.reload()} className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Refresh Graph</button>}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6 relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[2rem]">
              <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-indigo-300">
              <Network className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.32em]">Graph Summary</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <p className="text-xs text-slate-400">Total Nodes</p>
              <p className="mt-2 text-2xl font-bold text-white">{totalNodes}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <p className="text-xs text-slate-400">Total Relationships</p>
              <p className="mt-2 text-2xl font-bold text-white">{totalEdges}</p>
            </div>
            <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs text-red-400">Contradictions</p>
              <p className="mt-2 text-2xl font-bold text-red-400">{poisonedCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex gap-4 text-sm text-slate-400 text-center justify-center items-center h-[200px]">
            <p>Interactive graph visualization is disabled in this environment.<br/>Using summary data instead.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
            <div className="flex items-center gap-2 text-indigo-300">
              <ServerCrash className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.32em]">Contradiction Healing</p>
            </div>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              When conflicting memory contexts are detected, CortexShield flags the old relationships as POISONED. You can manually intervene and supersede them.
            </p>
            
            {poisonedEdge ? (
              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">Poisoned Relationship Detected</p>
                    <p className="mt-1 text-xs text-slate-400 font-mono">ID: {poisonedEdge.elementId}</p>
                    <button 
                      onClick={() => healEdge.mutate(poisonedEdge.elementId)}
                      disabled={healEdge.isPending}
                      className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-500 disabled:opacity-50 flex gap-2 items-center"
                    >
                      {healEdge.isPending ? 'Healing...' : 'Heal Edge Now'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Graph is Healthy</p>
                  <p className="mt-1 text-xs text-slate-400">No active contradictions found.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};
