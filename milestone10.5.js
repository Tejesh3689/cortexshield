const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    // =========================================================================
    // 1. STAGING DEPLOYMENT WORKFLOW
    // =========================================================================
    ".github/workflows/deploy-staging.yml": `name: Deploy to Staging

on:
  push:
    branches:
      - main

jobs:
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      proxy-engine: \${{ steps.filter.outputs.proxy-engine }}
      healing-worker: \${{ steps.filter.outputs.healing-worker }}
      anomaly-service: \${{ steps.filter.outputs.anomaly-service }}
      policy-service: \${{ steps.filter.outputs.policy-service }}
    steps:
      - uses: actions/checkout@v4
      
      # Turborepo-aware path filtering per Blueprint section 1.1
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            proxy-engine:
              - 'apps/proxy-engine/**'
              - 'libs/cortex_schemas/**'
              - 'libs/cortex_auth/**'
            healing-worker:
              - 'apps/healing-worker/**'
              - 'libs/cortex_schemas/**'
            anomaly-service:
              - 'apps/anomaly-service/**'
            policy-service:
              - 'apps/policy-service/**'

  build-and-push:
    name: Build & Push Images
    needs: changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [proxy-engine, healing-worker, anomaly-service, policy-service]
    steps:
      - uses: actions/checkout@v4
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
      
      - name: Log in to Registry
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push \${{ matrix.service }}
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
        uses: docker/build-push-action@v5
        with:
          context: apps/\${{ matrix.service }}
          push: true
          tags: ghcr.io/cortexshield/\${{ matrix.service }}:\${{ github.sha }}

  argocd-sync:
    name: ArgoCD Sync (Staging)
    needs: [changes, build-and-push]
    runs-on: ubuntu-latest
    # Only run if at least one service changed and built successfully
    if: \${{ needs.changes.outputs.proxy-engine == 'true' || needs.changes.outputs.healing-worker == 'true' || needs.changes.outputs.anomaly-service == 'true' || needs.changes.outputs.policy-service == 'true' }}
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
          
      - name: Sync Changed Services
        env:
          ARGOCD_SERVER: argocd.internal.cortexshield.com
          ARGOCD_AUTH_TOKEN: \${{ secrets.ARGOCD_TOKEN }}
        run: |
          # Sync only the applications that had underlying code changes
          if [ "\${{ needs.changes.outputs.proxy-engine }}" == "true" ]; then
            argocd app sync proxy-engine-staging --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
            argocd app wait proxy-engine-staging --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.healing-worker }}" == "true" ]; then
            argocd app sync healing-worker-staging --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.anomaly-service }}" == "true" ]; then
            argocd app sync anomaly-service-staging --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.policy-service }}" == "true" ]; then
            argocd app sync policy-service-staging --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
`,

    // =========================================================================
    // 2. PRODUCTION DEPLOYMENT WORKFLOW
    // =========================================================================
    ".github/workflows/deploy-production.yml": `name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger production on release tags

jobs:
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      proxy-engine: \${{ steps.filter.outputs.proxy-engine }}
      healing-worker: \${{ steps.filter.outputs.healing-worker }}
      anomaly-service: \${{ steps.filter.outputs.anomaly-service }}
      policy-service: \${{ steps.filter.outputs.policy-service }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            proxy-engine:
              - 'apps/proxy-engine/**'
              - 'libs/cortex_schemas/**'
              - 'libs/cortex_auth/**'
            healing-worker:
              - 'apps/healing-worker/**'
              - 'libs/cortex_schemas/**'
            anomaly-service:
              - 'apps/anomaly-service/**'
            policy-service:
              - 'apps/policy-service/**'

  build-and-push:
    name: Build & Push Images
    needs: changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [proxy-engine, healing-worker, anomaly-service, policy-service]
    steps:
      - uses: actions/checkout@v4
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
      
      - name: Log in to Registry
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push \${{ matrix.service }}
        if: \${{ needs.changes.outputs[matrix.service] == 'true' }}
        uses: docker/build-push-action@v5
        with:
          context: apps/\${{ matrix.service }}
          push: true
          # Tag with the release tag (e.g. v1.0.0)
          tags: ghcr.io/cortexshield/\${{ matrix.service }}:\${{ github.ref_name }}

  argocd-sync-prod:
    name: ArgoCD Sync (Production)
    needs: [changes, build-and-push]
    runs-on: ubuntu-latest
    # Requires manual approval via GitHub Environments protection rules
    environment: production
    if: \${{ needs.changes.outputs.proxy-engine == 'true' || needs.changes.outputs.healing-worker == 'true' || needs.changes.outputs.anomaly-service == 'true' || needs.changes.outputs.policy-service == 'true' }}
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
          
      - name: Sync Changed Services
        env:
          ARGOCD_SERVER: argocd.internal.cortexshield.com
          ARGOCD_AUTH_TOKEN: \${{ secrets.ARGOCD_TOKEN_PROD }}
        run: |
          if [ "\${{ needs.changes.outputs.proxy-engine }}" == "true" ]; then
            argocd app sync proxy-engine-prod --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.healing-worker }}" == "true" ]; then
            argocd app sync healing-worker-prod --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.anomaly-service }}" == "true" ]; then
            argocd app sync anomaly-service-prod --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
          
          if [ "\${{ needs.changes.outputs.policy-service }}" == "true" ]; then
            argocd app sync policy-service-prod --auth-token $ARGOCD_AUTH_TOKEN --server $ARGOCD_SERVER --grpc-web
          fi
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 10.5 GitHub Actions workflows created successfully.");
