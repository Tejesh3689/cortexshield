export const dynamic = 'force-dynamic';

async function getPolicies() {
  try {
    const res = await fetch(process.env.POLICY_SERVICE_URL || 'http://localhost:8000/bundles/bundle.tar.gz', { method: 'HEAD' });
    return res.ok ? "Bundle available online (preview hidden)" : "Policy Service Offline";
  } catch(e) {
    return "Policy Service Offline";
  }
}

export default async function PoliciesViewer() {
  const status = await getPolicies();
  
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Active Policies (Rego)</h2>
      
      <div className="bg-slate-900 border border-slate-800 rounded p-6">
        <h3 className="text-lg font-medium text-white mb-2">restricted_tools.rego</h3>
        <pre className="bg-slate-950 p-4 rounded text-slate-300 text-sm overflow-x-auto border border-slate-800">
{content}
        </pre>
        <p className="mt-4 text-slate-400 text-sm">Status: {status}</p>
      </div>
    </div>
  );
}

const content = `package cortexshield.restricted_tools

restricted_set := {"send_webhook", "execute_shell_command", "drop_database_table", "export_pii"}

is_restricted[tool_name] {
    restricted_set[tool_name]
}`;
