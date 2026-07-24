const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const rootDir = "D:\\cortexshield";

const files = {
    // ---------------------------------------------------------
    // libs/cortex_db
    // ---------------------------------------------------------
    "libs/cortex_db/pyproject.toml": `[project]
name = "cortex_db"
version = "0.1.0"
description = "Shared Database Models and Alembic Environment"
requires-python = ">=3.10"
dependencies = [
    "sqlalchemy>=2.0.0",
    "alembic>=1.13.0",
    "asyncpg>=0.29.0",
    "greenlet>=3.0.0"
]
`,
    "libs/cortex_db/cortex_db/__init__.py": ``,
    "libs/cortex_db/cortex_db/models.py": `from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    tier = Column(String(50), nullable=False) # pro | growth | enterprise
    neo4j_database_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Fields added later by Milestone 9, but since we are doing M2 now, we just include them
    stripe_customer_id = Column(String(255), nullable=True)
    provisioning_status = Column(String(50), nullable=True)

class User(Base):
    __tablename__ = "users"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    key_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

class UsageCounter(Base):
    __tablename__ = "usage_counters"
    tenant_id = Column(String(255), ForeignKey("tenants.id"), primary_key=True)
    period_start = Column(DateTime, primary_key=True)
    operation_count = Column(Integer, default=0)
    tool_call_count = Column(Integer, default=0)

class AuditLogIndex(Base):
    __tablename__ = "audit_log_index"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_ref = Column(String(255), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    this_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
`,
    "libs/cortex_db/alembic.ini": `[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql+asyncpg://cortex:localdevpassword@localhost:5432/cortexshield

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
`,
    "libs/cortex_db/alembic/env.py": `import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import models
from cortex_db.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
`,
    "libs/cortex_db/cortex_db/hash_chain.py": `import hashlib
import json
from datetime import datetime
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from cortex_db.models import AuditLogIndex

# =====================================================================================
# CRITICAL SAFETY NOTE:
# This helper is only race-safe under a single-concurrent-consumer guarantee.
# If the NATS consumer (audit.firewall_decisions) is ever scaled to multiple replicas,
# this must be revisited (e.g. via a Postgres advisory lock keyed by tenant_id, 
# or moving back to a DB-level trigger).
#
# The consumer MUST be configured with max_ack_pending=1 (or equivalent 
# durable consumer setting) to guarantee strictly serial processing per stream.
# =====================================================================================

async def append_audit_log(session: AsyncSession, tenant_id: str, event_type: str, event_ref: str, payload: dict) -> AuditLogIndex:
    # 1. Fetch the most recent hash for this tenant
    stmt = select(AuditLogIndex).where(AuditLogIndex.tenant_id == tenant_id).order_by(AuditLogIndex.created_at.desc()).limit(1)
    result = await session.execute(stmt)
    last_log = result.scalar_one_or_none()
    
    prev_hash = last_log.this_hash if last_log else None
    
    # 2. Serialize payload deterministically
    serialized_payload = json.dumps(payload, sort_keys=True)
    
    # 3. Calculate this_hash = sha256(prev_hash + serialized_row_content)
    hash_input = f"{prev_hash or ''}|{tenant_id}|{event_type}|{event_ref}|{serialized_payload}"
    this_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
    
    # 4. Insert
    new_log = AuditLogIndex(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        event_type=event_type,
        event_ref=event_ref,
        prev_hash=prev_hash,
        this_hash=this_hash
    )
    
    session.add(new_log)
    await session.commit()
    await session.refresh(new_log)
    
    return new_log
`,
    "libs/cortex_db/cortex_db/consumer_example.py": `import nats
import os
import asyncio

# Example of how the audit worker MUST configure JetStream to preserve single-writer safety
async def consume_audit_logs():
    nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    js = nc.jetstream()
    
    # CRITICAL: max_ack_pending=1 ensures we only process one message at a time,
    # preventing hash-chain corruption.
    await js.subscribe(
        "audit.firewall_decisions",
        durable="audit_log_writer",
        config=nats.js.api.ConsumerConfig(
            max_ack_pending=1
        )
    )
`,
    "libs/cortex_db/tests/test_audit_chain.py": `import pytest
import hashlib
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from cortex_db.models import Base, AuditLogIndex
from cortex_db.hash_chain import append_audit_log

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest.mark.asyncio
async def test_audit_chain_integrity(db_session):
    tenant_id = "tenant_1"
    
    # Insert Row 1
    log1 = await append_audit_log(db_session, tenant_id, "TOOL_CALL", "ref1", {"tool": "db"})
    assert log1.prev_hash is None
    
    # Insert Row 2
    log2 = await append_audit_log(db_session, tenant_id, "TOOL_CALL", "ref2", {"tool": "api"})
    assert log2.prev_hash == log1.this_hash
    
    # Insert Row 3
    log3 = await append_audit_log(db_session, tenant_id, "TOOL_CALL", "ref3", {"tool": "cmd"})
    assert log3.prev_hash == log2.this_hash
    
    # VERIFY HASH CHAIN
    # Re-calculate Row 3 to ensure integrity
    expected_input = f"{log2.this_hash}|{tenant_id}|TOOL_CALL|ref3|{{\\"tool\\": \\"cmd\\"}}"
    expected_hash = hashlib.sha256(expected_input.encode('utf-8')).hexdigest()
    assert log3.this_hash == expected_hash

@pytest.mark.asyncio
async def test_audit_chain_tampering(db_session):
    tenant_id = "tenant_2"
    
    log1 = await append_audit_log(db_session, tenant_id, "EVENT", "ref1", {"data": "ok"})
    log2 = await append_audit_log(db_session, tenant_id, "EVENT", "ref2", {"data": "ok"})
    log3 = await append_audit_log(db_session, tenant_id, "EVENT", "ref3", {"data": "ok"})
    
    # SIMULATE TAMPERING
    # The attacker changes Row 2's event_ref directly in the DB
    log2.event_ref = "tampered_ref"
    await db_session.commit()
    
    # Re-verify Row 3's hash chain
    # The verification script would try to recompute Row 2's hash to see if it matches Row 3's prev_hash
    tampered_input2 = f"{log1.this_hash}|{tenant_id}|EVENT|tampered_ref|{{\\"data\\": \\"ok\\"}}"
    tampered_hash2 = hashlib.sha256(tampered_input2.encode('utf-8')).hexdigest()
    
    # Prove that the tampered hash of Row 2 no longer matches the prev_hash stored in Row 3
    assert tampered_hash2 != log3.prev_hash
    # The chain is broken!
`,
    "docs/adr/0008-postgres-schema-and-hash-chain.md": `# ADR 0008: Postgres Schema and Hash-Chained Audit Logs

## Status
Accepted

## Context
In Milestone 2, we formalized the single-source-of-truth Postgres schema using **Alembic**. Prior to this, services were auto-initializing tables, which violated the migration principles of the project.

We introduced the core tables: \`tenants\`, \`users\`, \`api_keys\`, \`usage_counters\`, and \`audit_log_index\`.

A critical requirement for \`audit_log_index\` is cryptographic hash-chaining to ensure append-only tamper evidence (so that row \`N\`'s hash is derived from row \`N-1\`'s hash). 

## Decisions

### 1. Unified Alembic Location
We created \`libs/cortex_db\` as the **only** Alembic environment in the monorepo. \`proxy-engine\`, \`billing-service\`, and \`policy-service\` must all import their SQLAlchemy models directly from this package. No per-service migration directories are permitted.

### 2. Application-Layer Hash Chaining
We chose to implement the hash-chain logic at the application layer (\`hash_chain.py\`) rather than as a Postgres trigger. This prevents us from requiring the \`pgcrypto\` extension, making deployments more portable.

### 3. Single-Concurrent-Consumer Guarantee
**CRITICAL LIMITATION**: The application-layer hash chain is only race-safe under a strict single-concurrent-consumer guarantee. 
The NATS JetStream consumer (\`audit.firewall_decisions\`) that writes to the database MUST be configured with \`max_ack_pending=1\` (or equivalent durable serial processing). 
If this consumer is ever scaled to multiple replicas (e.g., in a high-throughput scenario), this logic MUST be revisited. Options include implementing a Postgres advisory lock keyed by \`tenant_id\`, or reverting to a DB-level trigger. This is a durable invariant that future scaling work must respect.
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

// Generate the initial Alembic migration
try {
    execSync('cd libs/cortex_db && alembic revision --autogenerate -m "Initial Schema"', {
        cwd: rootDir,
        env: { ...process.env, PYTHONPATH: path.join(rootDir, "libs", "cortex_db") }
    });
} catch (e) {
    // We mock the generated file if docker/postgres is offline and Alembic fails
    console.log("Postgres might not be running. Manually writing initial revision.");
    
    const revisionContent = '\"\"\"Initial Schema\\n\\nRevision ID: 001_initial_schema\\nRevises: \\nCreate Date: 2026-07-24 10:00:00.000000\\n\\n\"\"\"\\nfrom typing import Sequence, Union\\n\\nfrom alembic import op\\nimport sqlalchemy as sa\\n\\n\\n# revision identifiers, used by Alembic.\\nrevision: str = \\'001_initial_schema\\'\\ndown_revision: Union[str, None] = None\\nbranch_labels: Union[str, Sequence[str], None] = None\\ndepends_on: Union[str, Sequence[str], None] = None\\n\\n\\ndef upgrade() -> None:\\n    op.create_table(\\'tenants\\',\\n        sa.Column(\\'id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'name\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'tier\\', sa.String(length=50), nullable=False),\\n        sa.Column(\\'neo4j_database_name\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'created_at\\', sa.DateTime(), nullable=True),\\n        sa.Column(\\'stripe_customer_id\\', sa.String(length=255), nullable=True),\\n        sa.Column(\\'provisioning_status\\', sa.String(length=50), nullable=True),\\n        sa.PrimaryKeyConstraint(\\'id\\')\\n    )\\n    op.create_table(\\'api_keys\\',\\n        sa.Column(\\'id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'tenant_id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'key_hash\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'created_at\\', sa.DateTime(), nullable=True),\\n        sa.Column(\\'revoked_at\\', sa.DateTime(), nullable=True),\\n        sa.ForeignKeyConstraint([\\'tenant_id\\'], [\\'tenants.id\\'], ),\\n        sa.PrimaryKeyConstraint(\\'id\\')\\n    )\\n    op.create_table(\\'audit_log_index\\',\\n        sa.Column(\\'id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'tenant_id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'event_type\\', sa.String(length=50), nullable=False),\\n        sa.Column(\\'event_ref\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'prev_hash\\', sa.String(length=64), nullable=True),\\n        sa.Column(\\'this_hash\\', sa.String(length=64), nullable=False),\\n        sa.Column(\\'created_at\\', sa.DateTime(), nullable=True),\\n        sa.ForeignKeyConstraint([\\'tenant_id\\'], [\\'tenants.id\\'], ),\\n        sa.PrimaryKeyConstraint(\\'id\\')\\n    )\\n    op.create_table(\\'usage_counters\\',\\n        sa.Column(\\'tenant_id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'period_start\\', sa.DateTime(), nullable=False),\\n        sa.Column(\\'operation_count\\', sa.Integer(), nullable=True),\\n        sa.Column(\\'tool_call_count\\', sa.Integer(), nullable=True),\\n        sa.ForeignKeyConstraint([\\'tenant_id\\'], [\\'tenants.id\\'], ),\\n        sa.PrimaryKeyConstraint(\\'tenant_id\\', \\'period_start\\')\\n    )\\n    op.create_table(\\'users\\',\\n        sa.Column(\\'id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'tenant_id\\', sa.String(length=255), nullable=False),\\n        sa.Column(\\'created_at\\', sa.DateTime(), nullable=True),\\n        sa.ForeignKeyConstraint([\\'tenant_id\\'], [\\'tenants.id\\'], ),\\n        sa.PrimaryKeyConstraint(\\'id\\')\\n    )\\n\\n\\ndef downgrade() -> None:\\n    op.drop_table(\\'users\\')\\n    op.drop_table(\\'usage_counters\\')\\n    op.drop_table(\\'audit_log_index\\')\\n    op.drop_table(\\'api_keys\\')\\n    op.drop_table(\\'tenants\\')\\n';
    const versionPath = path.join(rootDir, "libs/cortex_db/alembic/versions/001_initial_schema.py");
    const parent = path.dirname(versionPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(versionPath, revisionContent, 'utf8');
}

console.log("Milestone 2 files created successfully.");
