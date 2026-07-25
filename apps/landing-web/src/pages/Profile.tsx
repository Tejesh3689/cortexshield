import React from 'react';
import { CheckCircle2, Globe2, Lock, Mail, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useAuth } from '../lib/AuthContext';

export const Profile: React.FC = () => {
  const { userEmail, tenantId } = useAuth();
  
  return (
  <WorkspaceShell
    title="Profile"
    description="Keep your account details, preferences, and security controls aligned with your organization’s expectations."
    badge="Account profile"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Edit profile</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-indigo-600 text-xl font-semibold text-white">
            {userEmail?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">{userEmail || 'Admin User'}</p>
            <p className="mt-2 text-sm text-slate-400">Workspace Owner · Tenant: {tenantId || 'Unknown'}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Email', value: userEmail || 'Not set', icon: Mail },
            { label: 'Phone', value: '+1 (415) 555-0198', icon: Phone },
            { label: 'Locale', value: 'UTC-7 · English', icon: Globe2 },
            { label: 'Security', value: 'MFA enabled', icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <div className="flex items-center gap-2 text-slate-400"><span><Icon className="h-4 w-4" /></span><span className="text-sm">{item.label}</span></div>
                <p className="mt-3 text-sm font-semibold text-white">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Profile completion</p>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-5">
            <div className="flex items-center justify-between text-sm text-slate-400"><span>76% complete</span><span>Ready for billing</span></div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 w-[76%] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Lock className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Security settings</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3"><span>MFA enabled</span><CheckCircle2 className="h-4 w-4 text-emerald-300" /></div>
            <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3"><span>Session activity monitored</span><CheckCircle2 className="h-4 w-4 text-emerald-300" /></div>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
  );
};