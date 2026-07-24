import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Create an async SQLAlchemy engine
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://cortex:localdevpassword@localhost:5432/cortexshield"
)

# Ensure the driver is asyncpg
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
if "?sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?sslmode=", "?ssl=")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db_session() -> AsyncSession:
    """Dependency that provides an async session."""
    async with async_session_maker() as session:
        yield session
