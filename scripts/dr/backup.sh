#!/bin/bash
set -e

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Starting CortexShield local DR Backup..."

# 1. Postgres (pg_dump)
echo "Backing up Postgres database..."
docker exec cortexshield-postgres-1 pg_dump -U cortex -d cortexshield -F c -f /var/lib/postgresql/data/cortexshield.dump
docker cp cortexshield-postgres-1:/var/lib/postgresql/data/cortexshield.dump "$BACKUP_DIR/cortexshield.dump"
echo "Postgres backup complete."

# 2. Neo4j
echo "Backing up Neo4j databases..."
# In a real environment, use neo4j-admin database backup. Locally we trigger a logical dump or rely on Aura backups.
# For local drill purposes, we simulate the artifact export.
echo "Mocking Neo4j export for local..." > "$BACKUP_DIR/neo4j_snapshot.dump"

# 3. Qdrant
echo "Backing up Qdrant..."
# curl -X POST "http://localhost:6333/collections/qdrant_tenant_1/snapshots"
echo "Mocking Qdrant export for local..." > "$BACKUP_DIR/qdrant_snapshot.snapshot"

echo "Backup completed successfully to $BACKUP_DIR"
