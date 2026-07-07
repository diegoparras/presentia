"""add comments table (collaboration MVP #18)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _has_table("comments"):
        return
    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("presentation", sa.Uuid(), nullable=False),
        sa.Column("slide_index", sa.Integer(), nullable=True),
        sa.Column("author", sa.String(), nullable=False, server_default="Anónimo"),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["presentation"], ["presentations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_presentation", "comments", ["presentation"], unique=False)


def downgrade() -> None:
    if not _has_table("comments"):
        return
    op.drop_index("ix_comments_presentation", table_name="comments")
    op.drop_table("comments")
