const http = require('http');

function postApi(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`http://localhost:6001${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

function getApi(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:6001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    }).on('error', err => reject(err));
  });
}

async function runTest() {
  console.log("=== TESTING POST /api/graph/heal EDGE REMEDIATION ===");
  const targetEdgeId = "link_4";

  // 1. Check initial status
  const beforeGraph = await getApi('/api/graph');
  const targetBefore = beforeGraph.links ? beforeGraph.links.find(l => l.id === targetEdgeId) : null;
  console.log(`1. Target Edge status BEFORE remediation:`, targetBefore ? targetBefore.status : 'Not found');

  // 2. Call POST /api/graph/heal
  console.log(`2. Calling POST /api/graph/heal for edge: ${targetEdgeId}...`);
  const healResult = await postApi('/api/graph/heal', { edge_element_id: targetEdgeId });
  console.log(`   Response:`, healResult);

  // 3. Check graph status after remediation
  const afterGraph = await getApi('/api/graph');
  const targetAfter = afterGraph.links ? afterGraph.links.find(l => l.id === targetEdgeId) : null;
  console.log(`3. Target Edge status AFTER remediation:`, targetAfter ? targetAfter.status : 'Not found');

  if (healResult.success && targetAfter && targetAfter.status === 'SUPERSEDED') {
    console.log("SUCCESS! Edge successfully flipped from FLAGGED_POISON (Red) to SUPERSEDED (Gray)!");
  } else {
    console.error("FAILURE! Edge did not transition properly.");
  }
}

runTest();
