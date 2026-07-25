const http = require('http');

function checkApi(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:6001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', err => reject(err));
  });
}

async function run() {
  console.log("=== REGRESSION CHECK ===");
  try {
    const auditRes = await checkApi('/api/audit-logs');
    console.log("1. /api/audit-logs Status:", auditRes.success ? "OK (Live Postgres)" : "STANDBY/OFFLINE");
    console.log("   Audit Logs count:", auditRes.logs ? auditRes.logs.length : 0);
    if (auditRes.logs && auditRes.logs.length > 0) {
      console.log("   Sample Log prev_hash:", auditRes.logs[0].prevHash.slice(0, 16) + "...");
      console.log("   Sample Log this_hash:", auditRes.logs[0].hash.slice(0, 16) + "...");
    }

    const graphRes = await checkApi('/api/graph');
    console.log("2. /api/graph Status:", graphRes.success ? "OK (Live Neo4j)" : "FAILED");
    console.log("   Nodes count:", graphRes.nodes ? graphRes.nodes.length : 0);
    console.log("   Links count:", graphRes.links ? graphRes.links.length : 0);
    if (graphRes.links && graphRes.links.length > 0) {
      const poisonLinks = graphRes.links.filter(l => l.status === 'FLAGGED_POISON');
      console.log("   Poison Links found:", poisonLinks.length);
      console.log("   Sample Link Trust Score:", graphRes.links[0].trustScore);
    }
  } catch(e) {
    console.error("API test error:", e.message);
  }
}

run();
