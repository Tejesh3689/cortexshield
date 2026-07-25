import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Activity, Shield, Network, FileText, ShieldCheck } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = Boolean(
    key &&
      key.startsWith("pk_") &&
      !key.includes("placeholder") &&
      key.length > 30
  );

  return (
    <div className="flex h-screen bg-slate-950" suppressHydrationWarning>
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col" suppressHydrationWarning>
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
          <Link href="/dashboard/compliance" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
            <ShieldCheck size={18} /> Compliance
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800" suppressHydrationWarning>
          {isClerkConfigured ? (
            <UserButton showName />
          ) : (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-semibold text-blue-400 text-xs">
                AD
              </div>
              <div className="flex flex-col text-xs">
                <span className="font-medium text-slate-200">Admin User</span>
                <span className="text-slate-500">Local Dev</span>
              </div>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
