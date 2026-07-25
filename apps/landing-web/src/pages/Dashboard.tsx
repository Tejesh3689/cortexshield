import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bell, CreditCard, Download, PlayCircle, ShieldCheck, Sparkles, User } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const overviewCards = [
  { label: 'Connected agents', value: '9', tone: 'text-cyan-300' },
  { label: 'Connected connectors', value: '24', tone: 'text-indigo-300' },
  { label: 'API keys', value: '3', tone: 'text-violet-300' },
  { label: 'Monthly usage', value: '64.2k', tone: 'text-emerald-300' }
];

const quickLinks = [
  { label: 'Connectors', to: '/connectors', description: 'Manage model and data integrations', icon: Sparkles },
  { label: 'Agents', to: '/agents', description: 'Monitor deployed AI agents', icon: Activity },
  { label: 'Security', to: '/security', description: 'Review trust controls', icon: ShieldCheck },
  { label: 'Deployments', to: '/deployments', description: 'Track live environments', icon: PlayCircle }
];

export const Dashboard: React.FC = () => (
  <WorkspaceShell
    title="Overview"
    description="A premium control center for your account, AI agents, connectors, security posture, and deployment operations."
    badge="Welcome back"
    action={<Link to="/profile" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"><User className="h-4 w-4" />Manage profile</Link>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/75 p-6 shadow-2xl shadow-indigo-950/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Account status</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">Your AI ecosystem is running smoothly</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">You have 9 active agents, 24 connected integrations, and 97/100 security posture coverage across your organization.</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">Healthy · 2m ago</div>
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
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Bell className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Latest activity</p>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ['Security event blocked', '2 min ago'],
              ['Connector sync complete', '11 min ago'],
              ['Billing export ready', '1 hr ago']
            ].map(([title, time]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-400">{time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <CreditCard className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Plan & spend</p>
          </div>
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-5">
            <p className="text-sm text-slate-400">Current plan</p>
            <p className="mt-3 text-3xl font-semibold text-white">Scale</p>
            <p className="mt-2 text-sm text-slate-400">$1,280 / month · 4.8k credits remaining</p>
            <button className="mt-5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">View billing</button>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
);
