import os
import sys
import logging

logging.basicConfig(level=logging.INFO)

try:
    from alembic import command
    from alembic.config import Config
    
    # Configure alembic to run against the database
    alembic_cfg = Config("libs/cortex_db/alembic.ini")
    
    # Apply the migrations up to head
    command.upgrade(alembic_cfg, "head")
    
    print("Alembic upgrade completed successfully.")
except Exception as e:
    print(f"Error running alembic: {e}")
    sys.exit(1)
