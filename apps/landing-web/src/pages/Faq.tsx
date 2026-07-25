import React from 'react';
import { Accordion, AccordionItem } from '../components/Accordion';

const faqItems: AccordionItem[] = [
  {
    question: 'How do I get started with AgentOS?',
    answer: 'Sign in to the platform, connect your first AI agent, and configure policies for safe tool access and memory retention.'
  },
  {
    question: 'Can I use AgentOS with private models and internal tools?',
    answer: 'Yes. AgentOS supports private deployments and can secure access to internal APIs, databases, and custom integrations.'
  },
  {
    question: 'What is the difference between Pro and Enterprise?',
    answer: 'Pro is designed for secure production teams with standard support. Enterprise includes dedicated onboarding, SLAs, and advanced governance capabilities.'
  }
];

export const Faq: React.FC = () => (
  <div className="min-h-screen bg-[#0B1220] px-6 py-16 text-slate-100">
    <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-[#111827]/80 p-10 shadow-2xl shadow-indigo-950/20">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">FAQ</p>
        <h1 className="text-4xl font-semibold text-white">Frequently asked questions</h1>
        <p className="max-w-3xl text-base leading-8 text-slate-400">Answers to the most common questions about AgentOS, integrations, and enterprise workflows.</p>
      </div>
      <div className="mt-10">
        <Accordion items={faqItems} />
      </div>
    </div>
  </div>
);
