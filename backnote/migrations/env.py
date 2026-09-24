import asyncio
import os

from alembic import context
from sqlalchemy.engine import Connection

from backnote.db.engine import create_engine
from backnote.db.models import Base

config = context.config
target_metadata = Base.metadata


def database_url() -> str:
    return (
        config.get_main_option("sqlalchemy.url")
        or os.environ.get("DATABASE_URL")
        or "sqlite+aiosqlite:///data/backnote.db"
    )


def _configure(**kwargs) -> None:
    # Batch mode lets Alembic emulate ALTER TABLE on SQLite.
    context.configure(target_metadata=target_metadata, render_as_batch=True, **kwargs)


def run_offline() -> None:
    _configure(url=database_url(), literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _run_sync(connection: Connection) -> None:
    _configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    engine = create_engine(database_url())
    async with engine.connect() as connection:
        await connection.run_sync(_run_sync)
    await engine.dispose()


if context.is_offline_mode():
    run_offline()
else:
    asyncio.run(run_online())
