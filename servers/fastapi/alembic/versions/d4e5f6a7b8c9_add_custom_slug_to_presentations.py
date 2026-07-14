"""add custom public slug to presentations

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("presentations", "custom_slug"):
        op.add_column(
            "presentations", sa.Column("custom_slug", sa.String(), nullable=True)
        )
        op.create_index(
            "ix_presentations_custom_slug",
            "presentations",
            ["custom_slug"],
            unique=True,
        )


def downgrade() -> None:
    if _has_column("presentations", "custom_slug"):
        op.drop_index("ix_presentations_custom_slug", table_name="presentations")
        op.drop_column("presentations", "custom_slug")
