"""add public sharing columns to presentations (Fase 4)

Revision ID: a1b2c3d4e5f6
Revises: 6f4b2a8c1d95
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "6f4b2a8c1d95"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("presentations", "is_public"):
        op.add_column(
            "presentations",
            sa.Column("is_public", sa.Boolean(), nullable=False, server_default="0"),
        )
    if not _has_column("presentations", "share_token"):
        op.add_column("presentations", sa.Column("share_token", sa.String(), nullable=True))
        op.create_index(
            "ix_presentations_share_token", "presentations", ["share_token"], unique=True
        )
    if not _has_column("presentations", "public_mode"):
        op.add_column(
            "presentations",
            sa.Column("public_mode", sa.String(), nullable=True, server_default="deck"),
        )


def downgrade() -> None:
    if _has_column("presentations", "public_mode"):
        op.drop_column("presentations", "public_mode")
    if _has_column("presentations", "share_token"):
        op.drop_index("ix_presentations_share_token", table_name="presentations")
        op.drop_column("presentations", "share_token")
    if _has_column("presentations", "is_public"):
        op.drop_column("presentations", "is_public")
