"""Add usage counter columns

Revision ID: 005_usage_counters
Revises: 004_workos_sso
Create Date: 2026-07-25 09:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '005_usage_counters'
down_revision: Union[str, None] = '004_workos_sso'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('usage_counters', sa.Column('memory_write_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('usage_counters', sa.Column('firewall_deny_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('usage_counters', sa.Column('poison_detection_count', sa.Integer(), nullable=True, server_default='0'))

def downgrade() -> None:
    op.drop_column('usage_counters', 'poison_detection_count')
    op.drop_column('usage_counters', 'firewall_deny_count')
    op.drop_column('usage_counters', 'memory_write_count')
