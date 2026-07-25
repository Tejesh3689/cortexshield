import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface ContentPageProps {
  title: string;
  description: string;
  bulletPoints: string[];
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export const ContentPage: React.FC<ContentPageProps> = ({
  title,
  description,
  bulletPoints,
  ctaLabel = 'Return Home',
  ctaHref = '/',
  secondaryLabel,
  secondaryHref
}) => {
  return (
    <div className="min-h-screen bg-[#0B1220] px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-white/10 bg-[#111827]/50 p-8 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300">CortexShield AI</p>
            <h1 className="font-heading text-3xl font-semibold text-white">{title}</h1>
          </div>
        </div>

        <p className="max-w-3xl text-base leading-relaxed text-slate-400">{description}</p>

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0B1220]/70 p-6 md:grid-cols-2">
          {bulletPoints.map((item) => (
            <div key={item} className="rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {secondaryLabel && secondaryHref ? (
            <Link
              to={secondaryHref}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};
