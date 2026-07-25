import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';

const pricingPlans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with secure AI workflows for small teams and pilots.',
    benefits: ['Up to 3 integrations', 'Basic policy templates', 'Community support'],
    cta: 'Start free',
    featured: false
  },
  {
    name: 'Pro',
    monthlyPrice: 129,
    yearlyPrice: 1440,
    description: 'A premium foundation for production AI operations and secure deployment.',
    benefits: ['Unlimited agents', 'MCP routing', 'Memory protection', 'Priority support', '50% savings with annual plan'],
    cta: 'Choose Pro',
    featured: true
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'Full enterprise support, dedicated onboarding, and compliance alignment.',
    benefits: ['Dedicated success manager', 'Custom SLAs', 'Advanced workflow controls', '24/7 phone support'],
    cta: 'Contact sales',
    featured: false
  }
];

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const displayPlans = useMemo(
    () => pricingPlans.map((plan) => {
      const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
      let display = '';
      let note = '';

      if (price === null) {
        display = 'Custom';
        note = 'Contact for pricing';
      } else if (price === 0) {
        display = 'Free';
        note = 'Forever';
      } else {
        display = `$${price}`;
        note = billingCycle === 'monthly' ? '/ month' : '/ year';
      }

      return { ...plan, display, note };
    }),
    [billingCycle]
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_50%)]" />
      <div className="pointer-events-none absolute right-0 top-32 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Pricing</span>
          <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">Flexible plans for modern AI teams.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">Choose the plan that fits your AI operations. Pro is our most popular option with 50% savings on annual billing.</p>
        </div>

        <div className="mt-8 flex justify-center gap-3 rounded-full bg-white/5 p-2 text-sm text-slate-300 shadow-inner shadow-black/10 inline-flex w-full max-w-xs mx-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-full px-6 py-2 transition font-semibold ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`rounded-full px-6 py-2 transition font-semibold flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}
          >
            Yearly
            <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-xs text-emerald-300">Save 12%</span>
          </button>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {displayPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[2rem] border p-8 transition ${
                plan.featured
                  ? 'border-indigo-500 bg-[#0B1220]/95 shadow-2xl shadow-indigo-950/20'
                  : 'border-white/10 bg-[#111827]/80 hover:border-white/20'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
                  <Zap className="h-3 w-3" />
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <p className="mt-3 text-sm text-slate-400">{plan.description}</p>
              <div className="mt-8 flex items-end gap-2">
                <span className="text-4xl font-extrabold text-white">{plan.display}</span>
                <span className="pb-1 text-sm text-slate-400">{plan.note}</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(plan.featured ? '/signin' : '/contact')}
                className={`mt-8 w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                  plan.featured
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { q: 'Can I upgrade or downgrade anytime?', a: 'Yes. Changes take effect at the end of your current billing cycle with prorated adjustments.' },
              { q: 'Do you offer discounts for annual billing?', a: 'Yes. Annual plans include 12% savings compared to monthly billing.' },
              { q: 'What is included in Enterprise?', a: 'Dedicated support, custom SLAs, advanced security controls, and guaranteed uptime.' },
              { q: 'Can I try Pro before committing?', a: "Absolutely. Start with Free and upgrade to Pro whenever you're ready." }
            ].map((item, i) => (
              <div key={i} className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/70 p-6 text-left">
                <p className="font-semibold text-white">{item.q}</p>
                <p className="mt-3 text-sm text-slate-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};