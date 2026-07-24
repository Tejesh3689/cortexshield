import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add workspace libs to path so cortex_db.models can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cortex_db.models import Base

config = context.config

if config.config_file_name:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        pass

target_metadata = Base.metadata

def load_env_file():
    # Attempt to load .env from workspace root or current directory if DATABASE_URL not set
    if "DATABASE_URL" not in os.environ:
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local")),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip()
                            if "#" in v:
                                v = v.split("#", 1)[0].strip()
                            os.environ.setdefault(k, v)
                break

load_env_file()

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
