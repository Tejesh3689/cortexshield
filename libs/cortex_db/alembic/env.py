import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# Load .env from the repository root (3 directories up from this file)
root_dir = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(root_dir / ".env", override=True)

config = context.config
config.set_main_option("sqlalchemy.url", os.environ.get("DATABASE_URL"))

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()

run_migrations_online()
