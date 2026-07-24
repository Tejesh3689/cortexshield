"""Billing Additions

Revision ID: 003_billing_additions
Revises: 002_tenant_overrides
Create Date: 2026-07-24 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_billing_additions'
down_revision: Union[str, None] = '002_tenant_overrides'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to tenants
    op.add_column('tenants', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('provisioning_status', sa.String(length=50), nullable=True))
    
    # Add column to usage_counters
    op.add_column('usage_counters', sa.Column('reported', sa.Boolean(), server_default='false', nullable=False))

def downgrade() -> None:
    op.drop_column('usage_counters', 'reported')
    op.drop_column('tenants', 'provisioning_status')
    op.drop_column('tenants', 'stripe_customer_id')
