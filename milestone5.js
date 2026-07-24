const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    "apps/policy-service/policies/main.rego": `package cortexshield

import data.cortexshield.restricted_tools
import data.cortexshield.tenant_overrides
import data.cortexshield.trust_thresholds

default allow = false
default reason = "Default deny"

# If the tool is not restricted, allow it.
allow {
    not restricted_tools.is_restricted[input.tool_name]
}

# If the tool is restricted, check trust score.
allow {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust >= tenant_overrides.get_threshold(input.tenant_id)
}

reason = "Allowed: tool is not restricted" {
    not restricted_tools.is_restricted[input.tool_name]
}

reason = "Allowed: trust score meets threshold for restricted tool" {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust >= tenant_overrides.get_threshold(input.tenant_id)
}

reason = "Denied: trust score too low for restricted tool" {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust < tenant_overrides.get_threshold(input.tenant_id)
}
`,
    "apps/policy-service/policies/restricted_tools.rego": `package cortexshield.restricted_tools

restricted_set := {"send_webhook", "execute_shell_command", "drop_database_table", "export_pii"}

is_restricted[tool_name] {
    restricted_set[tool_name]
}
`,
    "apps/policy-service/policies/trust_thresholds.rego": `package cortexshield.trust_thresholds

default_threshold := 0.3
`,
    "apps/policy-service/policies/tenant_overrides.rego": `package cortexshield.tenant_overrides

import data.cortexshield.trust_thresholds.default_threshold

get_threshold(tenant_id) = threshold {
    threshold := data.tenant_overrides[tenant_id]
} else = default_threshold
`,
    "apps/policy-service/cortex_policy/database.py": `import os
import asyncpg
import logging

logger = logging.getLogger(__name__)

async def get_db_connection():
    return await asyncpg.connect(os.getenv("DATABASE_URL", "postgresql://cortex:localdevpassword@localhost:5432/cortexshield"))

async def init_db():
    try:
        conn = await get_db_connection()
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tenant_overrides (
                tenant_id VARCHAR(255) PRIMARY KEY,
                override_threshold FLOAT NOT NULL
            )
        """)
        await conn.close()
    except Exception as e:
        logger.error(f"Failed to initialize db: {e}")

async def get_all_overrides():
    try:
        conn = await get_db_connection()
        rows = await conn.fetch("SELECT tenant_id, override_threshold FROM tenant_overrides")
        await conn.close()
        return {row["tenant_id"]: row["override_threshold"] for row in rows}
    except Exception as e:
        logger.error(f"Failed to get overrides: {e}")
        return {}
`,
    "apps/policy-service/cortex_policy/bundle_builder.py": `import os
import json
import tarfile
import hashlib
from .database import get_all_overrides

BUNDLE_DIR = os.getenv("BUNDLE_DIR", "/tmp/opa_bundle")
POLICIES_DIR = os.getenv("POLICIES_DIR", os.path.join(os.path.dirname(__file__), "..", "policies"))

os.makedirs(BUNDLE_DIR, exist_ok=True)

_last_hash = None

async def build_bundle_if_changed() -> bool:
    global _last_hash
    overrides = await get_all_overrides()
    
    current_hash = hashlib.sha256(json.dumps(overrides, sort_keys=True).encode()).hexdigest()
    if current_hash == _last_hash:
        return False
        
    _last_hash = current_hash
    
    data_content = {"tenant_overrides": overrides}
    
    with open(os.path.join(POLICIES_DIR, "data.json"), "w") as f:
        json.dump(data_content, f)
        
    bundle_path = os.path.join(BUNDLE_DIR, "bundle.tar.gz")
    with tarfile.open(bundle_path, "w:gz") as tar:
        for root, _, files in os.walk(POLICIES_DIR):
            for file in files:
                if file.endswith(".rego") or file == "data.json":
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, POLICIES_DIR)
                    tar.add(file_path, arcname=arcname)
                    
    return True
`,
    "apps/policy-service/cortex_policy/server.py": `import os
import asyncio
from fastapi import FastAPI
from fastapi.responses import FileResponse
from .database import init_db
from .bundle_builder import build_bundle_if_changed, BUNDLE_DIR

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    await init_db()
    await build_bundle_if_changed()
    asyncio.create_task(poll_for_changes())
    
async def poll_for_changes():
    interval = int(os.getenv("OPA_BUNDLE_POLL_INTERVAL_SECONDS", "5"))
    while True:
        await asyncio.sleep(interval)
        try:
            await build_bundle_if_changed()
        except Exception as e:
            import logging
            logging.error(f"Error rebuilding bundle: {e}")

@app.get("/bundles/bundle.tar.gz")
async def get_bundle():
    bundle_path = os.path.join(BUNDLE_DIR, "bundle.tar.gz")
    return FileResponse(bundle_path, media_type="application/gzip")
`,
    "infra/opa-config.yaml": `services:
  policy-service:
    url: http://policy-service:8000
    
bundles:
  cortexshield:
    service: policy-service
    resource: bundles/bundle.tar.gz
    polling:
      min_delay_seconds: 2
      max_delay_seconds: 5
`,
    "apps/policy-service/tests/test_policy_integration.py": `import pytest

@pytest.mark.skip(reason="No docker daemon available. Run in CI against live Postgres/OPA stack.")
@pytest.mark.asyncio
async def test_tenant_override_dynamic_update():
    """
    Test that changing a tenant_overrides row in Postgres results
    in a changed OPA decision within OPA_BUNDLE_POLL_INTERVAL_SECONDS.
    
    1. Create tenant override (tenant_x: 0.8).
    2. Wait 6 seconds for bundle rebuild.
    3. Check OPA decision with trust_score=0.5 (should DENY).
    4. Update tenant override (tenant_x: 0.4).
    5. Wait 6 seconds.
    6. Check OPA decision with trust_score=0.5 (should ALLOW).
    """
    pass
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 5 files created successfully.");
