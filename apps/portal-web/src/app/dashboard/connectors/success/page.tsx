"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Network } from 'lucide-react';
import Link from 'next/link';

export default function ConnectorSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Attempt automatic redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/graph');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#111827]/70 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        
        <h1 className="text-2xl font-semibold text-white mb-4">
          Connector Connected Successfully
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your connector has been securely connected to CortexShield.<br/><br/>
          The connector is now available for monitoring, memory analysis, and security auditing.
        </p>

        <div className="space-y-4">
          <Link 
            href="/dashboard/graph"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <Network className="h-5 w-5" />
            View Knowledge Graph
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          
          <p className="text-xs text-slate-500">
            Redirecting automatically in a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
