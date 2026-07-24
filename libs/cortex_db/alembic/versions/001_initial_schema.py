"""Initial Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('tenants',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('tier', sa.String(length=50), nullable=False),
        sa.Column('neo4j_database_name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
                        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('api_keys',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('audit_log_index',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('event_ref', sa.String(length=255), nullable=False),
        sa.Column('prev_hash', sa.String(length=64), nullable=True),
        sa.Column('this_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('usage_counters',
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('operation_count', sa.Integer(), nullable=True),
        sa.Column('tool_call_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('tenant_id', 'period_start')
    )
    op.create_table('users',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('users')
    op.drop_table('usage_counters')
    op.drop_table('audit_log_index')
    op.drop_table('api_keys')
    op.drop_table('tenants')
