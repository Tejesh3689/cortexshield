import os
import sys
from pathlib import Path
from logging.config import fileConfig
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# Load .env from repository root
root_dir = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(root_dir / ".env", override=True)
load_dotenv(root_dir / ".env.local", override=True)

# Add workspace libs to path so cortex_db.models can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cortex_db.models import Base

config = context.config

if config.config_file_name:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        pass

target_metadata = Base.metadata

def get_url():
    return os.getenv(
        "DATABASE_URL",
        config.get_main_option("sqlalchemy.url", "postgresql://neondb_owner:npg_fbUdE3gYPzm6@ep-hidden-scene-aytfw8o5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require")
    )

def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
