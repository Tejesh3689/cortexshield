import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Activity, Shield, Network, FileText } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-500" /> CortexShield
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
            <Activity size={18} /> Overview
          </Link>
          <Link href="/dashboard/graph" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
            <Network size={18} /> Graph View
          </Link>
          <Link href="/dashboard/audit-logs" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
            <FileText size={18} /> Audit Logs
          </Link>
          <Link href="/dashboard/policies" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
            <Shield size={18} /> Policies
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <UserButton showName />
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
