const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
  });
  try {
    await client.connect();
    console.log("SUCCESS: Connected to Postgres on localhost:5432!");
    
    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables found:", res.rows.map(r => r.table_name).join(', '));
    
    // Attempt to manually apply the alembic-like logic if we want to simulate the migration
    await client.end();
  } catch (err) {
    console.error("FAILED to connect to Postgres:", err.message);
  }
}

testConnection();
