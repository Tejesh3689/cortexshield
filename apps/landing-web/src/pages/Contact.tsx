import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Contact: React.FC = () => (
  <div className="min-h-screen bg-[#0B1220] px-6 py-16 text-slate-100">
    <div className="mx-auto max-w-5xl space-y-10 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-10 shadow-2xl shadow-indigo-950/20">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Get in touch with our team</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
          Whether you have questions about onboarding, pricing, or integrations, our team is ready to help.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/90 p-8">
          <form className="space-y-6">
            <label className="block text-sm font-semibold text-slate-200">
              Full name
              <input className="mt-2 w-full rounded-3xl border border-white/10 bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500" placeholder="Your name" />
            </label>

            <label className="block text-sm font-semibold text-slate-200">
              Email address
              <input className="mt-2 w-full rounded-3xl border border-white/10 bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500" placeholder="name@example.com" />
            </label>

            <label className="block text-sm font-semibold text-slate-200">
              Message
              <textarea rows={6} className="mt-2 w-full rounded-3xl border border-white/10 bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500" placeholder="Tell us about your project" />
            </label>

            <button type="button" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
              Send message
            </button>
          </form>
        </div>

        <div className="space-y-6 rounded-[1.75rem] border border-white/10 bg-[#0B1220]/90 p-8">
          <div className="flex items-start gap-4 rounded-3xl bg-white/5 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-600 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Email us</p>
              <p className="mt-1 text-sm text-slate-400">support@cortexshield.ai</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-3xl bg-white/5 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-600 text-white">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Call sales</p>
              <p className="mt-1 text-sm text-slate-400">+1 (415) 555-0192</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-3xl bg-white/5 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-600 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Headquarters</p>
              <p className="mt-1 text-sm text-slate-400">San Francisco, CA</p>
            </div>
          </div>

          <Link to="/faq" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            Visit FAQ
          </Link>
        </div>
      </div>
    </div>
  </div>
);
