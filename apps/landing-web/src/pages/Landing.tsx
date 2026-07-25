import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Cpu,
  Shield,
  Database,
  Lock,
  Server,
  Check,
  Zap,
  Globe,
  PlayCircle,
  MessageCircle
} from 'lucide-react';
import { Accordion, AccordionItem } from '../components/Accordion';

const featureCards = [
  {
    title: 'AI Agent Protection',
    description: 'Keep every autonomous workflow safe by enforcing trust boundaries before agents reach tools and integrations.',
    icon: Shield,
    accent: 'from-slate-900 via-indigo-800 to-indigo-600'
  },
  {
    title: 'MCP Integrations',
    description: 'Connect Model Context Protocol clients and servers securely with centralized routing and context validation.',
    icon: Server,
    accent: 'from-slate-900 via-sky-800 to-cyan-500'
  },
  {
    title: 'Secure Integrations',
    description: 'Gate every third-party connector with consistent policy controls and encrypted access paths.',
    icon: Globe,
    accent: 'from-slate-900 via-emerald-800 to-emerald-500'
  },
  {
    title: 'Memory Protection',
    description: 'Prevent prompt injection and knowledge poisoning with policy-aware validation at every storage boundary.',
    icon: Database,
    accent: 'from-slate-900 via-amber-800 to-amber-400'
  },
  {
    title: 'Enterprise Security',
    description: 'Keep identity, audit, and compliance aligned across every environment without adding friction.',
    icon: Lock,
    accent: 'from-slate-900 via-rose-800 to-pink-500'
  },
  {
    title: 'Performance & Reliability',
    description: 'Designed for high-throughput AI systems with minimal latency and elegant operational controls.',
    icon: Cpu,
    accent: 'from-slate-900 via-violet-800 to-violet-500'
  }
];

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    description: 'Get started with secure AI workflows for small teams and pilots.',
    benefits: ['Up to 3 integrations', 'Basic policy templates', 'Community support'],
    cta: 'Start free',
    featured: false
  },
  {
    name: 'Pro',
    price: 129,
    description: 'A premium foundation for production AI operations and secure deployment.',
    benefits: ['Unlimited agents', 'MCP routing', 'Memory protection', 'Priority support'],
    cta: 'Choose Pro',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Full enterprise support, dedicated onboarding, and compliance alignment.',
    benefits: ['Dedicated success', 'Custom SLAs', 'Advanced workflow controls'],
    cta: 'Contact sales',
    featured: false
  }
];

const faqItems: AccordionItem[] = [
  {
    question: 'How does CortexShield AI protect AI agents?',
    answer: 'CortexShield AI inspects every agent request through a policy gateway that blocks unsafe tool actions and protects knowledge updates before they become persistent.'
  },
  {
    question: 'What is MCP integration support?',
    answer: 'Our platform connects MCP clients and servers through secure routing, applying access controls and telemetry without changing existing models.'
  },
  {
    question: 'Can I manage multiple teams and environments?',
    answer: 'Yes. CortexShield AI is built for enterprise teams with isolated workspaces, shared governance, and a single control plane for policy and audit.'
  }
];

const workflowSteps = [
  {
    label: 'Connect',
    text: 'Link AI agents, tools, and MCP systems through a single secure entry point.'
  },
  {
    label: 'Secure',
    text: 'Apply policy, memory validation, and runtime checks before actions execute.'
  },
  {
    label: 'Operate',
    text: 'Observe activity, manage access, and keep compliance aligned across your team.'
  }
];

const testimonials = [
  {
    quote: 'CortexShield AI gave us a unified control plane for AI workloads without disrupting our toolchain.',
    author: 'Maya Chen',
    role: 'Head of AI Ops, Lunar Labs'
  },
  {
    quote: 'The platform made MCP and memory protection feel effortless for our engineering teams.',
    author: 'Noah Patel',
    role: 'Platform Lead, BrightForge'
  }
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeFeature, setActiveFeature] = useState(featureCards[0].title);

  const pricingRows = useMemo(
    () => pricingPlans.map((plan) => ({
      ...plan,
      display: typeof plan.price === 'number' ? `$${plan.price}` : plan.price,
      note: typeof plan.price === 'number' ? '/ month' : 'Custom'
    })),
    []
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_50%)]" />
      <div className="pointer-events-none absolute right-0 top-32 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                <Sparkles className="h-4 w-4" />
                Enterprise-ready AI security
              </span>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white md:text-6xl">
                Secure AI agents and MCP systems with a single premium control plane.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
                CortexShield AI delivers modern security for autonomous workflows, protecting integrations, memory, and runtime behavior while your teams stay fast and aligned.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button onClick={() => navigate('/get-started')} className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/contact')} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Book a Demo
                <PlayCircle className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.2 }} className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-[#111827]/80 p-5 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Launch Velocity</p>
                <p className="mt-3 text-white font-semibold">Deploy secure AI workflows in days, not months.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#111827]/80 p-5 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Policy Coverage</p>
                <p className="mt-3 text-white font-semibold">Central governance for agents, MCP routes, and integrations.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#111827]/80 p-5 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Enterprise Ready</p>
                <p className="mt-3 text-white font-semibold">Secure by default with audit, encryption, and role-aware controls.</p>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#111827]/90 p-8 shadow-2xl shadow-indigo-950/20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_35%)]" />
            <div className="relative grid gap-4">
              <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0B1220]/90 p-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Live status</p>
                  <p className="mt-2 text-xl font-semibold text-white">All services operational</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">Secure</span>
              </div>

              <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#0B1220]/90 p-6">
                {workflowSteps.map((step, index) => (
                  <div key={step.label} className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-3xl bg-indigo-600 text-white">
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Zap className="h-4 w-4 text-indigo-300" />
                  <span>Built for fast AI teams with secure operations.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#111827]/80 p-4 text-slate-300">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">AI Agents</p>
                    <p className="mt-3 text-sm text-white">Connected and protected across every route.</p>
                  </div>
                  <div className="rounded-3xl bg-[#111827]/80 p-4 text-slate-300">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">MCP Routes</p>
                    <p className="mt-3 text-sm text-white">Policy-aware routing for all model context traffic.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_0.8fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Product overview</span>
            <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">A premium foundation for secure AI operations.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
              CortexShield AI unifies agent security, MCP integration, and memory protection in a single product experience designed for enterprise teams.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featureCards.slice(0, 4).map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.title === activeFeature;
              return (
                <button
                  key={feature.title}
                  type="button"
                  onClick={() => setActiveFeature(feature.title)}
                  className={`group rounded-[2rem] border p-6 text-left transition ${isActive ? 'border-indigo-500 bg-[#1E293B]/90' : 'border-white/10 bg-[#111827]/80 hover:border-white/20 hover:bg-[#1F2937]/90'}`}
                >
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${feature.accent} text-white shadow-lg shadow-slate-950/20`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0B1220]/90 p-8">
            <h3 className="text-xl font-semibold text-white">Selected feature</h3>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {featureCards.find((feature) => feature.title === activeFeature)?.description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-8">
            <span className="text-xs uppercase tracking-[0.32em] text-indigo-300">Platform workflow</span>
            <h3 className="mt-4 text-2xl font-semibold text-white">From connection to governance.</h3>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Visualize how your AI workflows move through secure routing, policy enforcement, and audit visibility in one elegant platform.
            </p>
            <div className="mt-8 space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="rounded-3xl border border-white/10 bg-[#0B1220]/80 p-5 text-slate-300">
                  <div className="flex items-center gap-3 text-sm font-semibold text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-indigo-600 text-white">{index + 1}</div>
                    {step.label}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/80 p-6 text-slate-300">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Why choose us</p>
                <h4 className="mt-4 text-lg font-semibold text-white">Unified control plane</h4>
                <p className="mt-3 text-sm leading-7 text-slate-400">One platform for secure AI agents, endpoints, and integrations.</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/80 p-6 text-slate-300">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Modern operations</p>
                <h4 className="mt-4 text-lg font-semibold text-white">Premium enterprise UX</h4>
                <p className="mt-3 text-sm leading-7 text-slate-400">Clear status, secure defaults, and accessible workflows for every team.</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0B1220]/80 p-6 text-slate-300">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Built for scale</p>
                <h4 className="mt-4 text-lg font-semibold text-white">Future-proof integrations</h4>
                <p className="mt-3 text-sm leading-7 text-slate-400">Start with proof-of-concept and expand into enterprise-grade deployments.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Pricing</span>
          <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">Flexible price tiers for modern AI teams.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">Choose the plan that fits your goals, with a powerful Pro option for production deployments.</p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-6">
          <div className="flex justify-center gap-3 rounded-full bg-white/5 p-2 text-sm text-slate-300 shadow-inner shadow-black/10">
            <button onClick={() => setBillingCycle('monthly')} className={`rounded-full px-4 py-2 transition ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('annual')} className={`rounded-full px-4 py-2 transition ${billingCycle === 'annual' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}>
              Annual
            </button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {pricingRows.map((plan) => (
              <div key={plan.name} className={`rounded-[2rem] border p-8 transition ${plan.featured ? 'border-indigo-500 bg-[#0B1220]/95 shadow-2xl shadow-indigo-950/20' : 'border-white/10 bg-[#111827]/80 hover:border-white/20'}`}>
                {plan.featured && <span className="mb-4 inline-flex rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white">Popular</span>}
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
                <button onClick={() => navigate(plan.featured ? '/get-started' : '/contact')} className={`mt-8 w-full rounded-full px-4 py-3 text-sm font-semibold transition ${plan.featured ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-8">
            <span className="text-xs uppercase tracking-[0.32em] text-indigo-300">Testimonials</span>
            <div className="mt-8 space-y-6">
              {testimonials.map((testimonial) => (
                <div key={testimonial.author} className="rounded-[2rem] border border-white/10 bg-[#0B1220]/80 p-6">
                  <p className="text-lg leading-8 text-slate-100">“{testimonial.quote}”</p>
                  <p className="mt-6 text-sm font-semibold text-white">{testimonial.author}</p>
                  <p className="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-8">
            <span className="text-xs uppercase tracking-[0.32em] text-indigo-300">Your questions</span>
            <div className="mt-8">
              <Accordion items={faqItems} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="rounded-[2.5rem] border border-white/10 bg-[#111827]/90 p-12 text-center shadow-2xl shadow-indigo-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">Get started</p>
          <h2 className="mt-6 text-3xl font-extrabold text-white sm:text-4xl">Move from pilot to enterprise with confidence.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-400">
            Start your secure AI workspace, connect your first agents, and keep every integration governed under one modern platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate('/get-started')} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500">
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/contact')} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Talk to sales
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
