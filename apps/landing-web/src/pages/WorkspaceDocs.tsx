import React from 'react';
import { BookOpen, ChevronRight, FileText, PackageOpen } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const docs = [
  { title: 'Quick start', description: 'Set up your first connector and agent in under 10 minutes.' },
  { title: 'API reference', description: 'Explore the latest endpoints, permissions, and auth flows.' },
  { title: 'Best practices', description: 'Design secure prompts, memory, and deployment pipelines.' }
];

export const WorkspaceDocs: React.FC = () => (
  <WorkspaceShell
    title="Documentation"
    description="Browse authenticated resources that help your team ship faster with confidence."
    badge="Knowledge center"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Search docs</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Popular resources</p>
        <div className="mt-6 space-y-4">
          {docs.map((doc) => (
            <div key={doc.title} className="flex items-start justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">{doc.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{doc.description}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <FileText className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Release notes</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">Improved policy guardrails and safer connector defaults.</div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">New deployment templates for enterprise AI workloads.</div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <PackageOpen className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Templates</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">Customer support workflow</div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">Finance and compliance review</div>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
);