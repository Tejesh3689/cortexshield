import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity as ActivityIcon, 
  Zap, 
  Lock, 
  Search,
  Filter,
  Eye,
  AlertOctagon,
  Clock,
  Terminal,
  Play,
  X
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ThreatLog, initialThreatLogs } from '../mockData';

interface SecurityProps {
  threats?: ThreatLog[];
  onTriggerAttack?: () => void;
}

export const Security: React.FC<SecurityProps> = ({ 
  threats = initialThreatLogs, 
  onTriggerAttack = () => undefined
}) => {
  const [selectedThreat, setSelectedThreat] = useState<ThreatLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Recharts threat type distribution dataset
  const threatDistribution = [
    { name: 'Prompt Injections', value: threats.filter(t => t.type === 'Prompt Injection').length },
    { name: 'PII Data Leaks', value: threats.filter(t => t.type === 'Data Leak').length },
    { name: 'Bypasses', value: threats.filter(t => t.type === 'PBI Bypass').length },
    { name: 'Auth Blocks', value: threats.filter(t => t.type === 'Unauthorized Access').length }
  ].filter(t => t.value > 0);

  const COLORS = ['#818CF8', '#F59E0B', '#F472B6', '#EF4444'];

  const filteredThreats = threats.filter(t => 
    t.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const riskScore = threats.length > 5 ? 78 : threats.length > 3 ? 42 : 12;

  return (
    <div className="text-left space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white font-heading">Security Gateway & Guardrails</h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time proxy firewall auditing prompts, checking data leak parameters, and halting adversarial overrides.
          </p>
        </div>
        
        {/* Trigger Exploit Simulation */}
        <button 
          onClick={onTriggerAttack}
          className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4.5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all glow-danger animate-pulse cursor-pointer"
        >
          <Zap className="h-4 w-4 fill-red-400/25" />
          <span>Simulate Prompt Injection</span>
        </button>
      </div>

      {/* Threats summary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Risk meter score */}
        <div className="glass-panel rounded-2xl border border-white/5 p-4.5 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">System Risk Index</span>
          <span className={`font-heading text-3xl font-black mt-1.5 ${
            riskScore > 70 ? 'text-red-500' : riskScore > 30 ? 'text-amber-500' : 'text-emerald-400'
          }`}>{riskScore}%</span>
          <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
            {riskScore > 70 ? 'High vulnerability' : 'Standard guardrails'}
          </span>
        </div>

        {/* Injection blocks */}
        <div className="glass-panel rounded-2xl border border-white/5 p-4.5">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Injection Blocks</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="font-heading text-2xl font-bold text-white mt-2.5 block">
            {threats.filter(t => t.type === 'Prompt Injection').length}
          </span>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">100% gateway mitigated</span>
        </div>

        {/* PII Blocks */}
        <div className="glass-panel rounded-2xl border border-white/5 p-4.5">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Data Leak Blocks</span>
            <Lock className="h-4 w-4" />
          </div>
          <span className="font-heading text-2xl font-bold text-white mt-2.5 block">
            {threats.filter(t => t.type === 'Data Leak').length}
          </span>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">0 leaks leaked</span>
        </div>

        {/* Total Events Audited */}
        <div className="glass-panel rounded-2xl border border-white/5 p-4.5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Safeguarded queries</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-heading text-2xl font-bold text-white mt-2.5 block">148,290</span>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">Gateway proxy queries</span>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Distribution Chart (Pie) */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <span className="text-xs font-bold text-white block">Threat Category distribution</span>
              <span className="text-[10px] text-slate-500">Breakdown of intercepted attack vectors.</span>
            </div>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '11px', color: '#FFFFFF' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Security Log (Table) */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <span className="text-xs font-bold text-white block">Intercepted Threat Vectors Log</span>
              <span className="text-[10px] text-slate-500">Live feed of blocked requests. Click inspect to view threat details.</span>
            </div>
            <div className="relative w-48">
              <Search className="absolute top-1.5 left-2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-white/5 py-1 pr-3 pl-7 text-[10px] text-white placeholder-slate-500 outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredThreats.map((threat) => (
              <div 
                key={threat.id} 
                className="rounded-xl border border-white/5 bg-white/2.5 p-3.5 transition-all hover:bg-white/5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${
                      threat.risk === 'Critical' ? 'bg-red-500 animate-ping' : threat.risk === 'High' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <span className="font-heading text-xs font-bold text-white leading-none block">{threat.type}</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Agent: <span className="text-indigo-400 font-semibold">{threat.agentName}</span> &bull; IP: {threat.ip}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      threat.risk === 'Critical' 
                        ? 'bg-red-500/20 text-red-400' 
                        : threat.risk === 'High' 
                        ? 'bg-orange-500/20 text-orange-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {threat.risk}
                    </span>
                    <button
                      onClick={() => setSelectedThreat(threat)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0B1220] py-1 px-2.5 text-[10px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Payload</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredThreats.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500">
                No threat logs registered.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Threat Payload Inspect Overlay Modal */}
      {selectedThreat && (
        <>
          <div className="fixed inset-0 bg-[#0B1220]/50 backdrop-blur-xs z-50" onClick={() => setSelectedThreat(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-2xl z-50 animate-scale-in text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500" />
                <h3 className="font-heading text-base font-extrabold text-white">Adversarial Threat Inspection</h3>
              </div>
              <button 
                onClick={() => setSelectedThreat(null)}
                className="rounded-lg bg-white/5 p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Threat Target</span>
                  <span className="text-white mt-1 block">{selectedThreat.agentName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Interception Time</span>
                  <span className="text-white mt-1 block font-mono">{selectedThreat.timestamp}</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Mitigation Strategy</span>
                <span className="mt-1 block text-xs text-emerald-400 font-semibold">
                  Gateway blocked API request propagation; returned 403 Forbidden payload wrapper to client.
                </span>
              </div>

              {/* Payload code block */}
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold mb-2">Raw Request Payload</span>
                <div className="rounded-xl bg-black/40 border border-white/5 p-4.5 font-mono text-[10px] text-red-400 overflow-x-auto leading-normal">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-2 border-b border-white/5 pb-1">
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Payload Stream</span>
                  </div>
                  {selectedThreat.payload}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
