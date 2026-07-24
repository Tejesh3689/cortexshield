"""Tenant Overrides

Revision ID: 002_tenant_overrides
Revises: 001_initial_schema
Create Date: 2026-07-24 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '002_tenant_overrides'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First, drop the dynamically created tables from M5/M7 if they exist in the DB already
    op.execute("DROP TABLE IF EXISTS tenant_overrides")
    op.execute("DROP TABLE IF EXISTS tenant_egress_overrides")
    
    op.create_table('tenant_overrides',
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('rule_type', sa.String(length=50), nullable=False),
        sa.Column('rule_value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('tenant_id', 'rule_type')
    )


def downgrade() -> None:
    op.drop_table('tenant_overrides')
