"""add dataset column to presentations (Suite Escriba, Fase 4)

Revision ID: 3e7a91c4d2b8
Revises: c7b70d0f31b1
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e7a91c4d2b8'
down_revision: Union[str, None] = 'c7b70d0f31b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column('presentations', 'dataset'):
        op.add_column('presentations', sa.Column('dataset', sa.JSON(), nullable=True))


def downgrade() -> None:
    if _has_column('presentations', 'dataset'):
        op.drop_column('presentations', 'dataset')
