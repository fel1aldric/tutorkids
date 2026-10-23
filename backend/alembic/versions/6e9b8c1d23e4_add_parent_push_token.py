"""add parent push token

Revision ID: 6e9b8c1d23e4
Revises: 5d7a8e9f12b3
Create Date: 2025-10-22 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e9b8c1d23e4'
down_revision: Union[str, Sequence[str], None] = '5d7a8e9f12b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('parents', sa.Column('push_token', sa.String(length=255), nullable=True))
    op.add_column('parents', sa.Column('push_provider', sa.String(length=50), nullable=True, server_default='expo'))


def downgrade() -> None:
    op.drop_column('parents', 'push_provider')
    op.drop_column('parents', 'push_token')
