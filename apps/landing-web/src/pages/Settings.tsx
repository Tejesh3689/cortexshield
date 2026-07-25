import React, { useState } from 'react';
import { 
  Key, 
  Users, 
  CreditCard, 
  Building2, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Info,
  X,
  ShieldCheck
} from 'lucide-react';
import { useApiKeys } from '../hooks/useApiKeys';
import { useAuth } from '../lib/AuthContext';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'keys' | 'billing'>('keys');
  const { data, createKey, revokeKey, isLoading } = useApiKeys();
  const { userEmail } = useAuth();
  
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeyData, setCreatedKeyData] = useState<{ raw_key: string, name: string } | null>(null);

  // Team list
  const teamMembers = [
    { name: 'Jane Doe', email: 'jane.doe@agentos.ai', role: 'Workspace Owner', status: 'Active' },
    { name: 'John Smith', email: 'john.smith@agentos.ai', role: 'Security Lead', status: 'Active' },
    { name: 'Sarah Connor', email: 's.connor@agentos.ai', role: 'DevOps Lead', status: 'Active' },
    { name: 'Sam Rivera', email: 'sam.rivera@agentos.ai', role: 'Support Specialist', status: 'Active' }
  ];

  const handleCopyKey = (keyId: string, keyVal: string) => {
    navigator.clipboard.writeText(keyVal).then(() => {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 1500);
    });
  };

  const handleRevokeKey = (keyId: string) => {
    revokeKey.mutate(keyId);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const res = await createKey.mutateAsync(newKeyName);
    if (res.success) {
      setCreatedKeyData({ raw_key: res.api_key.raw_key, name: res.api_key.name });
      setNewKeyName('');
    }
  };

  return (
    <div className="text-left space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white">Platform Settings</h1>
          <p className="mt-1 text-xs text-slate-400">
            Configure company profiles, manage member access, provision API keys, and audit billing metrics.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/5 overflow-x-auto pb-px">
        {[
          { id: 'profile', label: 'Company Profile', icon: Building2 },
          { id: 'team', label: 'Team Members', icon: Users },
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'billing', label: 'Billing & Invoices', icon: CreditCard }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id 
                  ? 'border-indigo-500 text-white font-bold' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* API Keys Tab view */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">API Authentication Keys</h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Provide these authorization tokens in headers to query the AgentOS proxy gateway.
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Generate New API Key</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-4">Key identifier name</th>
                  <th className="py-3.5">API secret key token</th>
                  <th className="py-3.5">Created Date</th>
                  <th className="py-3.5">Last query</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading && <tr><td colSpan={6} className="py-4 text-center">Loading keys...</td></tr>}
                {!isLoading && data?.api_keys?.map((k) => {
                  const isCopied = copiedKeyId === k.id;
                  return (
                    <tr key={k.id} className="hover:bg-white/2.5">
                      <td className="py-3.5 pl-4 font-semibold text-white">{k.id}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5 max-w-[240px]">
                          <span>
                            {k.key_prefix}••••••••••••
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono">{new Date(k.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 text-slate-400 font-mono">-</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          k.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border border-white/5'
                        }`}>
                          {k.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyKey(k.id, k.key_prefix)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                            title="Copy to Clipboard"
                          >
                            {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                          
                          {k.status === 'Active' && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              disabled={revokeKey.isPending}
                              className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                              title="Revoke Key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compliance Box */}
          <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4 flex gap-3 text-left">
            <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-white">Security Compliance notice</span>
              <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                AgentOS enforces standard rotating policies. Key rotation is recommended every 90 days. 
                Revoked keys are permanently invalidated immediately and cannot be recovered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white">Access & Member Management</h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Add analysts, security operators, and developers to your workspace.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-4">Member</th>
                  <th className="py-3.5">Email address</th>
                  <th className="py-3.5">Workspace Role</th>
                  <th className="py-3.5 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teamMembers.map((member, idx) => (
                  <tr key={idx} className="hover:bg-white/2.5">
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                          {idx === 0 ? userEmail?.charAt(0).toUpperCase() || 'U' : member.name.split(' ').map(w => w[0]).join('')}
                        </div>
                        <span className="font-semibold text-white">{idx === 0 ? (userEmail?.split('@')[0] || member.name) : member.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono">{idx === 0 ? (userEmail || member.email) : member.email}</td>
                    <td className="py-3.5 text-slate-300">{member.role}</td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        member.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="glass-panel rounded-2xl border border-white/5 p-5 max-w-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Company Profile Settings</h3>
            <p className="text-[10px] text-slate-500 mt-1">Configure company name and contact parameters.</p>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Company Name</label>
              <input 
                type="text" 
                defaultValue="Acme Corporation" 
                className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-white outline-hidden focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Billing Email</label>
              <input 
                type="email" 
                defaultValue="billing@acme.com" 
                className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-white outline-hidden focus:border-indigo-500" 
              />
            </div>
            <button className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 cursor-pointer">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Billing tab */}
      {activeTab === 'billing' && (
        <div className="glass-panel rounded-2xl border border-white/5 p-5 max-w-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Billing Information</h3>
            <p className="text-[10px] text-slate-500 mt-1">Review active enterprise billing plans.</p>
          </div>
          
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Professional Enterprise Plan</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">$239/mo, billed annually</span>
              </div>
            </div>
            <span className="rounded bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase">
              Paid
            </span>
          </div>

          <div className="border-t border-white/5 pt-4 text-xs">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Payment Method</span>
            <div className="flex items-center justify-between bg-white/2.5 border border-white/5 rounded-xl p-3 text-slate-300">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Visa ending in 9821</span>
              </div>
              <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal Dialog */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-[#0B1220]/50 backdrop-blur-xs z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-2xl z-50 animate-scale-in text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-heading text-sm font-bold text-white">{createdKeyData ? 'Save Your New Key' : 'Generate New API Key'}</h3>
              <button 
                onClick={() => { setShowCreateModal(false); setCreatedKeyData(null); }}
                className="rounded-lg bg-white/5 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdKeyData ? (
              <div className="space-y-4">
                <p className="text-[10px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Please copy this key now. For security reasons, you will not be able to see it again.
                </p>
                <div className="mt-4 p-3 rounded-xl bg-[#0B1220] border border-white/10 break-all text-xs font-mono text-emerald-300">
                  {createdKeyData.raw_key}
                </div>
                <button 
                  onClick={() => handleCopyKey('raw', createdKeyData.raw_key)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 cursor-pointer flex justify-center items-center gap-2"
                >
                  {copiedKeyId === 'raw' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copiedKeyId === 'raw' ? 'Copied to Clipboard' : 'Copy Key'}
                </button>
                <button 
                  onClick={() => { setShowCreateModal(false); setCreatedKeyData(null); }}
                  className="w-full mt-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 cursor-pointer"
                >
                  I've saved it securely
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">
                    Key Description Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Webhook Router"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-3.5 py-2 text-xs text-white outline-hidden focus:border-indigo-500 focus:bg-[#0B1220] focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createKey.isPending}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    {createKey.isPending ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};
