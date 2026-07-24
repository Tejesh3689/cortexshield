import os
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config
config.set_main_option("sqlalchemy.url", os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/db"))

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
