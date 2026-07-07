"""add presentation_versions table (version history #18)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _has_table("presentation_versions"):
        return
    op.create_table(
        "presentation_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("presentation", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("author", sa.String(), nullable=False, server_default="Anónimo"),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["presentation"], ["presentations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_presentation_versions_presentation",
        "presentation_versions",
        ["presentation"],
        unique=False,
    )


def downgrade() -> None:
    if not _has_table("presentation_versions"):
        return
    op.drop_index(
        "ix_presentation_versions_presentation", table_name="presentation_versions"
    )
    op.drop_table("presentation_versions")
