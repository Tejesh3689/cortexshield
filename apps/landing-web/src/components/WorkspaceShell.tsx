import React, { ReactNode } from 'react';

interface WorkspaceShellProps {
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ title, description, badge, action, children }) => (
  <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
    <div className="rounded-[2rem] border border-white/10 bg-[#0B1220]/75 p-6 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {badge ? <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300">{badge}</span> : null}
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </div>

    <div className="space-y-6">{children}</div>
  </div>
);
