#!/bin/bash
set -e

TENANT_ID=$1
TIER=$2
DB_NAME="neo4j_tenant_${TENANT_ID}"

if [ -z "$TENANT_ID" ] || [ -z "$TIER" ]; then
    echo "Usage: ./provision-tenant.sh <tenant_id> <tier>"
    exit 1
fi

echo "Provisioning tenant $TENANT_ID at tier $TIER..."

if [ "$TIER" == "enterprise" ]; then
    echo "ENTERPRISE TIER: Standing up dedicated Neo4j container for $TENANT_ID..."
    
    # Run a totally dedicated container with resource limits to prevent noisy neighbor
    # We use a distinct port to avoid collision, realistically this would be handled by a proxy or k8s
    # In local docker-compose, we just run it directly.
    docker run -d --name "${DB_NAME}" \
        --cpus="2.0" --memory="2G" \
        -e NEO4J_AUTH=neo4j/localdevpassword \
        -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
        neo4j:5-enterprise
        
    # Wait for the container to be ready
    echo "Waiting for dedicated container to boot..."
    sleep 15
    
    echo "Tenant $TENANT_ID is provisioned on dedicated container ${DB_NAME}."
else
    echo "GROWTH TIER: Creating isolated database within shared cluster..."
    # Execute Cypher CREATE DATABASE on the shared default container
    docker exec -it cortexshield-neo4j-1 cypher-shell -u neo4j -p localdevpassword "CREATE DATABASE ${DB_NAME} IF NOT EXISTS;"
    
    echo "Tenant $TENANT_ID is provisioned on shared container database ${DB_NAME}."
fi

# Qdrant collection creation (shared cluster, isolated collections)
echo "Creating dedicated Qdrant collection qdrant_tenant_${TENANT_ID}..."
curl -X PUT "http://localhost:6333/collections/qdrant_tenant_${TENANT_ID}" \
    -H 'Content-Type: application/json' \
    -d '{
        "vectors": {
            "size": 1536,
            "distance": "Cosine"
        }
    }' || true

echo "Provisioning complete!"
