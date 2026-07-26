"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, ShieldAlert, CheckCircle, ShieldOff } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        fetchAlerts(); // refresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading alerts...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-8 h-8" />
            Temporal Alerts
          </h1>
          <p className="text-slate-400 mt-2">
            Detecting sleeper attacks and long-term adversarial injections.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{alerts.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Open Alerts</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
            <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-200">No active alerts</h3>
            <p className="text-slate-500 mt-2">Your memory graph is secure.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="bg-slate-900 border border-red-900/30 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full uppercase tracking-wider border border-red-500/20">
                      {alert.alert_type}
                    </span>
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Detected {new Date(alert.detected_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm">
                    <span className="text-blue-400">{alert.subject}</span>
                    <span className="text-slate-500 mx-2">{alert.predicate}</span>
                    <span className="text-emerald-400">{alert.object}</span>
                  </div>
                  
                  <div className="flex gap-6 text-sm text-slate-400">
                    <div>
                      <span className="block text-xs text-slate-500 uppercase">Fact Age</span>
                      <span className="text-slate-200 font-medium">{alert.fact_age_days} days</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase">Recent References</span>
                      <span className="text-red-400 font-medium">{alert.reference_count}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase">Trust Score</span>
                      <span className="text-slate-200 font-medium">{(alert.trust_score * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase">Origin</span>
                      <span className="text-slate-200 font-medium">{alert.origin}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleAction(alert.id, "CONFIRMED_ATTACK")}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Quarantine Fact
                  </button>
                  <button 
                    onClick={() => handleAction(alert.id, "DISMISSED")}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ShieldOff className="w-4 h-4" />
                    Dismiss (False Positive)
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.92 0 5 1 7 2a1 1 0 0 1 1 1v7z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
