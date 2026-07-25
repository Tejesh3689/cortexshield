"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, FileJson, FileText, AlertTriangle, CheckCircle2, Download } from "lucide-react";

export default function CompliancePage() {
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-31");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (format: "json" | "pdf") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compliance/report?start_date=${startDate}&end_date=${endDate}&format=${format}`);
      
      if (!res.ok) {
        throw new Error(`Failed to generate report: ${res.statusText}`);
      }

      if (format === "pdf") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CortexShield_Compliance_Report_${startDate}_${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        if (data.success === false) {
          throw new Error(data.error || "Unknown error occurred");
        }
        setReportData(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Center</h1>
          <p className="text-sm text-slate-400">EU AI Act (Articles 12, 13, 15) Transparency & Auditing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white">Generate Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => fetchReport("json")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-white p-2 rounded transition-colors disabled:opacity-50"
                >
                  <FileJson size={18} /> Preview JSON Data
                </button>
                <button
                  onClick={() => fetchReport("pdf")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  <Download size={18} /> Download PDF Report
                </button>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-400 text-sm rounded flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {reportData ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Report Preview</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">ID: {reportData.report_metadata.report_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-300">Generated: {new Date(reportData.report_metadata.generated_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-1">Total Decisions</p>
                  <p className="text-2xl font-bold text-white">{reportData.summary.total_ai_decisions}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-1">Interventions</p>
                  <p className="text-2xl font-bold text-amber-500">{reportData.summary.decisions_denied}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-1">Injections Blocked</p>
                  <p className="text-2xl font-bold text-red-500">{reportData.summary.injection_attempts_detected}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-400 mb-1">Audit Chain</p>
                  {reportData.summary.audit_chain_intact ? (
                    <div className="flex items-center gap-1 text-green-500 font-bold">
                      <CheckCircle2 size={18} /> Intact
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-500 font-bold">
                      <AlertTriangle size={18} /> Broken
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300">Compliance Mappings</h3>
                <div className="flex flex-wrap gap-2">
                  {reportData.report_metadata.regulatory_mapping.map((m: string) => (
                    <span key={m} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                  <FileText size={18} /> Raw JSON Data
                </h3>
                <div className="bg-slate-950 rounded p-4 border border-slate-800 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-slate-500 h-full min-h-[400px]">
              <ShieldCheck size={48} className="mb-4 opacity-50" />
              <p>Select a date range and generate a report to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
