import React, { useState } from 'react';
import { Copy, KeyRound, RefreshCcw, ShieldCheck, Trash2, X, Plus, Check } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useApiKeys } from '../hooks/useApiKeys';

export const ApiKeys: React.FC = () => {
  const { data, isLoading, createKey, revokeKey } = useApiKeys();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeyData, setCreatedKeyData] = useState<{ raw_key: string, name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const res = await createKey.mutateAsync(newKeyName);
    if (res.success) {
      setCreatedKeyData({ raw_key: res.api_key.raw_key, name: res.api_key.name });
      setNewKeyName('');
    }
  };

  return (
  <WorkspaceShell
    title="API Keys"
    description="Securely manage production, development, and sandbox credentials with clear usage and lifecycle controls."
    badge="Access management"
    action={
      <button 
        onClick={() => { setCreatedKeyData(null); setShowCreateModal(true); }}
        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 cursor-pointer flex items-center gap-2"
      >
        <Plus className="h-4 w-4" /> Create key
      </button>
    }
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
          {isLoading && <div className="text-sm text-slate-400 p-4">Loading keys...</div>}
          {!isLoading && data?.api_keys && data.api_keys.length === 0 && (
             <div className="text-sm text-slate-400 p-4 border border-white/5 rounded-2xl bg-white/5 text-center">No API keys found. Create one to get started.</div>
          )}
          {data?.api_keys?.map((key) => (
            <div key={key.id} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${key.status === 'Active' ? 'bg-indigo-600/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}><KeyRound className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">{key.id}</p>
                    <p className="mt-1 text-sm text-slate-400">{key.key_prefix}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${key.status === 'Active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{key.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                {key.revoked_at && <span>Revoked {new Date(key.revoked_at).toLocaleDateString()}</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleCopy(key.key_prefix, key.id)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 cursor-pointer">
                  {copiedId === key.id ? <Check className="mr-2 inline h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 inline h-4 w-4" />}
                  {copiedId === key.id ? 'Copied' : 'Copy ID'}
                </button>
                {key.status === 'Active' && (
                  <button onClick={() => revokeKey.mutate(key.id)} disabled={revokeKey.isPending} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer disabled:opacity-50">
                    <Trash2 className="mr-2 inline h-4 w-4" />Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Create Key Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] shadow-2xl p-6 relative">
          <button onClick={() => { setShowCreateModal(false); setCreatedKeyData(null); }} className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-bold text-white mb-2">{createdKeyData ? 'Save Your New Key' : 'Create API Key'}</h2>
          
          {createdKeyData ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                Please copy this key now. For security reasons, you will not be able to see it again.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-[#0B1220] border border-white/10 break-all text-sm font-mono text-emerald-300">
                {createdKeyData.raw_key}
              </div>
              <button 
                onClick={() => handleCopy(createdKeyData.raw_key, 'raw')}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer flex justify-center items-center gap-2"
              >
                {copiedId === 'raw' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedId === 'raw' ? 'Copied to Clipboard' : 'Copy Key'}
              </button>
              <button 
                onClick={() => { setShowCreateModal(false); setCreatedKeyData(null); }}
                className="w-full mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 cursor-pointer"
              >
                I've saved it securely
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <p className="text-sm text-slate-400">This key will grant programmatic access to your tenant's graph and operations.</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Name (Optional)</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Microservice"
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <button 
                type="submit" 
                disabled={createKey.isPending}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {createKey.isPending ? 'Generating...' : 'Generate Key'}
              </button>
            </form>
          )}
        </div>
      </div>
    )}
  </WorkspaceShell>
  );
};