"""WorkOS SSO

Revision ID: 004_workos_sso
Revises: 003_billing_additions
Create Date: 2026-07-24 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_workos_sso'
down_revision: Union[str, None] = '003_billing_additions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add domain and workos_org_id to tenants for Home Realm Discovery
    op.add_column('tenants', sa.Column('domain', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('workos_org_id', sa.String(length=255), nullable=True))
    # Add unique constraint on domain
    op.create_unique_constraint('uq_tenant_domain', 'tenants', ['domain'])

def downgrade() -> None:
    op.drop_constraint('uq_tenant_domain', 'tenants', type_='unique')
    op.drop_column('tenants', 'workos_org_id')
    op.drop_column('tenants', 'domain')
