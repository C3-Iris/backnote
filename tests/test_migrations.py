from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from backnote.db.models import Base


def test_migrations_match_models(db_url: str):
    sync_url = db_url.replace("+aiosqlite", "")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    engine.dispose()
    assert diff == [], f"Models changed without a migration: {diff}"
