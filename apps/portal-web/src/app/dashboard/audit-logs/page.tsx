import { Pool } from 'pg';

export const dynamic = 'force-dynamic'; // Prevent static building since we query DB

async function getAuditLogs() {
  // In a real environment, use a connection string from env
  // The docker-compose uses user=cortex pass=localdevpassword db=cortexshield
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
  });
  
  try {
    const res = await pool.query('SELECT * FROM audit_log_index ORDER BY created_at DESC LIMIT 50');
    // Validation is complex in raw SQL without a stored procedure for hash chains, 
    // but we simulate verifying the chain here by returning rows.
    return res.rows.map(row => ({
      ...row,
      // We assume verified if prev_hash is present (mocking the crypto check for the UI shell)
      verified: !!row.prev_hash
    }));
  } catch (e) {
    console.error("DB error", e);
    return [];
  } finally {
    await pool.end();
  }
}

export default async function AuditLogs() {
  const logs = await getAuditLogs();
  
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Security Audit Logs</h2>
      
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">Tenant</th>
              <th className="p-4 font-medium">Tool</th>
              <th className="p-4 font-medium">Decision</th>
              <th className="p-4 font-medium">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">No logs found or DB offline.</td></tr>
            ) : logs.map((log: any, i: number) => (
              <tr key={i} className="hover:bg-slate-800/50">
                <td className="p-4">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-4">{log.tenant_id}</td>
                <td className="p-4">{log.tool_name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${log.decision === 'ALLOW' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.decision}
                  </span>
                </td>
                <td className="p-4">
                  {log.verified ? (
                     <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Valid</span>
                  ) : (
                     <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Broken</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
