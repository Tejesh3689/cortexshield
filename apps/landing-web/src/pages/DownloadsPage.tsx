import React from 'react';
import { Download, FileCode2, Package, TerminalSquare, Laptop, Smartphone, BookOpen } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';

const downloads = [
  { title: 'Python SDK', version: 'v1.3.2', meta: 'Async client library', icon: FileCode2 },
  { title: 'Node SDK', version: 'v2.1.4', meta: 'TypeScript support', icon: Package },
  { title: 'CLI', version: 'v0.8.9', meta: 'Terminal automation', icon: TerminalSquare },
  { title: 'VSCode Extension', version: 'v1.4.1', meta: 'Editor integration', icon: Laptop }
];

export const DownloadsPage: React.FC = () => (
  <WorkspaceShell
    title="Downloads"
    description="Install the tools your team uses every day, from SDKs to desktop apps and developer extensions."
    badge="Developer resources"
    action={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">Download bundle</button>}
  >
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Latest packages</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {downloads.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300"><Icon className="h-5 w-5" /></div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">{item.version}</span>
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
                <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"><Download className="h-4 w-4" />Download</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Platforms</p>
          <div className="mt-5 grid gap-3">
            {[
              ['Windows', 'Installer'],
              ['macOS', 'DMG'],
              ['Linux', 'Deb/RPM']
            ].map(([name, label]) => (
              <div key={name} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 px-4 py-3 text-sm text-slate-400">
                <span className="text-white">{name}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <BookOpen className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em]">Release notes</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">Improved connector sync reliability and faster onboarding flows.</div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0B1220]/70 p-4">Added support for SSO-backed session revocation and new permissions.</div>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceShell>
);
