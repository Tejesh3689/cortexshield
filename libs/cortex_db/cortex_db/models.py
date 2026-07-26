from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    tier = Column(String(50), nullable=False) # pro | growth | enterprise
    neo4j_database_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_customer_id = Column(String(255), nullable=True)
    provisioning_status = Column(String(50), nullable=True)
    domain = Column(String(255), unique=True, nullable=True)
    workos_org_id = Column(String(255), nullable=True)

class TenantOverride(Base):
    __tablename__ = "tenant_overrides"
    tenant_id = Column(String(255), ForeignKey("tenants.id"), primary_key=True)
    rule_type = Column(String(50), primary_key=True)
    rule_value = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TenantPolicy(Base):
    __tablename__ = "tenant_policies"
    tenant_id = Column(String(255), ForeignKey("tenants.id"), primary_key=True)
    sleeper_age_threshold_days = Column(Integer, default=7)
    sleeper_reference_spike_threshold = Column(Integer, default=3)
    sleeper_trust_ceiling = Column(Float, default=0.5)
    alert_webhook_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AgentBehavioralProfile(Base):
    __tablename__ = "agent_behavioral_profiles"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    agent_id = Column(String(255), nullable=False)
    profile_period_start = Column(DateTime, nullable=False)
    profile_period_end = Column(DateTime, nullable=False)
    tool_distribution = Column(JSONB, nullable=False, default={})
    avg_content_length_bytes = Column(Float, nullable=True)
    stddev_content_length_bytes = Column(Float, nullable=True)
    avg_calls_per_session = Column(Float, nullable=True)
    typical_session_duration_minutes = Column(Float, nullable=True)
    hourly_distribution = Column(JSONB, nullable=False, default={})
    total_sessions = Column(Integer, nullable=False, default=0)
    total_calls = Column(Integer, nullable=False, default=0)
    is_stable = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    memory_write_count = Column(Integer, default=0)
    firewall_deny_count = Column(Integer, default=0)
    poison_detection_count = Column(Integer, default=0)
    reported = Column(Boolean, default=False)

class AuditLogIndex(Base):
    __tablename__ = "audit_log_index"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_ref = Column(String(255), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    this_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ComplianceReport(Base):
    __tablename__ = "compliance_reports"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    report_hash = Column(String(255), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    regulatory_frameworks = Column(JSONB, nullable=True)
