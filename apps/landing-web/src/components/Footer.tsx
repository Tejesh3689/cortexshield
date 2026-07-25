import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Send, Globe2 } from 'lucide-react';

const productLinks = [
  { title: 'Home', to: '/' },
  { title: 'Features', to: '/features' },
  { title: 'Security', to: '/security' }
];

const resourceLinks = [
  { title: 'Documentation', to: '/documentation' },
  { title: 'Blog', to: '/blog' },
  { title: 'Contact', to: '/contact' }
];

const companyLinks = [
  { title: 'About', to: '/about' },
  { title: 'Careers', to: '/careers' },
  { title: 'Support', to: '/support' }
];

const legalLinks = [
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Terms', to: '/terms' }
];

export const Footer: React.FC = () => (
  <footer className="border-t border-white/10 bg-[#0B1220] px-6 py-16 text-slate-300 sm:px-10">
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">CortexShield AI</p>
            <p className="text-xs text-slate-500">Premium AI security platform</p>
          </div>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Secure your AI operations, simplify implementation, and manage your workspace in one elegant product experience.
        </p>
        <div className="flex items-center gap-3 text-slate-400">
          <Link to="#" className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
            <MessageCircle className="h-4 w-4" />
          </Link>
          <Link to="#" className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
            <Send className="h-4 w-4" />
          </Link>
          <Link to="#" className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
            <Globe2 className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Product</h3>
        <div className="mt-5 space-y-3 text-sm">
          {productLinks.map((item) => (
            <Link key={item.title} to={item.to} className="block transition hover:text-white">
              {item.title}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Resources</h3>
        <div className="mt-5 space-y-3 text-sm">
          {resourceLinks.map((item) => (
            <Link key={item.title} to={item.to} className="block transition hover:text-white">
              {item.title}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Company</h3>
        <div className="mt-5 space-y-3 text-sm">
          {companyLinks.map((item) => (
            <Link key={item.title} to={item.to} className="block transition hover:text-white">
              {item.title}
            </Link>
          ))}
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Legal</h4>
            <div className="mt-3 space-y-3 text-sm">
              {legalLinks.map((item) => (
                <Link key={item.title} to={item.to} className="block transition hover:text-white">
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-12 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
      <p>© {new Date().getFullYear()} CortexShield AI. Crafted for secure AI teams.</p>
      <p className="mt-4 sm:mt-0">Built with premium motion, glassmorphism, and a polished enterprise feel.</p>
    </div>
  </footer>
);
