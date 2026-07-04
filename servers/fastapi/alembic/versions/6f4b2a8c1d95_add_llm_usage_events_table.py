"""add llm_usage_events table (Suite Escriba, Fase 5)

Revision ID: 6f4b2a8c1d95
Revises: 3e7a91c4d2b8
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f4b2a8c1d95'
down_revision: Union[str, None] = '3e7a91c4d2b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not _has_table('llm_usage_events'):
        op.create_table(
            'llm_usage_events',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('presentation_id', sa.String(), nullable=True),
            sa.Column('stage', sa.String(), nullable=True),
            sa.Column('slide_index', sa.Integer(), nullable=True),
            sa.Column('provider', sa.String(), nullable=True),
            sa.Column('model', sa.String(), nullable=True),
            sa.Column('input_tokens', sa.Integer(), nullable=False),
            sa.Column('output_tokens', sa.Integer(), nullable=False),
            sa.Column('cost_usd', sa.Float(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(
            'ix_llm_usage_events_presentation_id',
            'llm_usage_events',
            ['presentation_id'],
        )


def downgrade() -> None:
    if _has_table('llm_usage_events'):
        op.drop_index('ix_llm_usage_events_presentation_id', table_name='llm_usage_events')
        op.drop_table('llm_usage_events')
