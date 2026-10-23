"""add family messages

Revision ID: 5d7a8e9f12b3
Revises: 78d0c19ec370
Create Date: 2025-10-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d7a8e9f12b3'
down_revision: Union[str, None] = '78d0c19ec370'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create parent-child link table (many-to-many)
    op.create_table(
        'parent_child_links',
        sa.Column('parent_id', sa.CHAR(36), sa.ForeignKey('parents.id'), nullable=False),
        sa.Column('child_id', sa.CHAR(36), sa.ForeignKey('children.id'), nullable=False),
        sa.PrimaryKeyConstraint('parent_id', 'child_id'),
    )

    # Migrate existing single-parent relationships into the link table.
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        conn.execute(sa.text("""
            INSERT INTO parent_child_links (parent_id, child_id)
            SELECT parent_id, id FROM children WHERE parent_id IS NOT NULL
        """))
    else:
        op.execute(sa.text("""
            INSERT INTO parent_child_links (parent_id, child_id)
            SELECT parent_id, id FROM children WHERE parent_id IS NOT NULL
        """))

    # Drop the old single-parent column from children.
    op.drop_column('children', 'parent_id')

    # Create family messages table.
    op.create_table(
        'family_messages',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('sender_parent_id', sa.CHAR(36), sa.ForeignKey('parents.id'), nullable=False),
        sa.Column('recipient_parent_id', sa.CHAR(36), sa.ForeignKey('parents.id'), nullable=False),
        sa.Column('child_id', sa.CHAR(36), sa.ForeignKey('children.id'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('family_messages')
    op.add_column('children', sa.Column('parent_id', sa.CHAR(36), sa.ForeignKey('parents.id'), nullable=True))
    op.drop_table('parent_child_links')
