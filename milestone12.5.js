const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    // ---------------------------------------------------------
    // Modules: neo4j-aura
    // ---------------------------------------------------------
    "infra/terraform/modules/neo4j-aura/main.tf": `
variable "environment" { type = string }
variable "tenant_isolation_mode" { type = string }

# For the sake of a successful local 'terraform plan' without a real Aura API key,
# we use random_password and local outputs to simulate the Aura provisioning.
resource "random_password" "neo4j_password" {
  length  = 16
  special = false
}

output "NEO4J_URI" {
  value = var.environment == "production" ? "neo4j+s://prod-aura.databases.neo4j.io" : "bolt://localhost:7687"
}
output "NEO4J_USER" {
  value = "neo4j"
}
output "NEO4J_PASSWORD" {
  value     = random_password.neo4j_password.result
  sensitive = true
}
`,

    // ---------------------------------------------------------
    // Modules: qdrant
    // ---------------------------------------------------------
    "infra/terraform/modules/qdrant/main.tf": `
variable "environment" { type = string }

resource "random_password" "qdrant_api_key" {
  length  = 32
  special = false
}

output "QDRANT_URL" {
  value = var.environment == "production" ? "https://prod-cluster.qdrant.tech:6333" : "http://localhost:6333"
}
output "QDRANT_API_KEY" {
  value     = random_password.qdrant_api_key.result
  sensitive = true
}
`,

    // ---------------------------------------------------------
    // Modules: postgres
    // ---------------------------------------------------------
    "infra/terraform/modules/postgres/main.tf": `
variable "environment" { type = string }

resource "random_password" "pg_password" {
  length  = 16
  special = false
}

# Simulating Neon/RDS connection string
output "DATABASE_URL" {
  value     = var.environment == "production" ? "postgresql://cortex:\${random_password.pg_password.result}@prod-db.us-east-1.rds.amazonaws.com:5432/cortexshield" : "postgresql://cortex:localdevpassword@localhost:5432/cortexshield"
  sensitive = true
}
`,

    // ---------------------------------------------------------
    // Modules: nats
    // ---------------------------------------------------------
    "infra/terraform/modules/nats/main.tf": `
variable "environment" { type = string }

output "NATS_URL" {
  value = var.environment == "production" ? "nats://nats.internal.cortexshield.com:4222" : "nats://localhost:4222"
}
`,

    // ---------------------------------------------------------
    // Modules: eks
    // ---------------------------------------------------------
    "infra/terraform/modules/eks/main.tf": `
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

# Mocking EKS cluster for plan success
output "cluster_name" {
  value = "cortexshield-\${var.environment}-eks"
}
output "cluster_endpoint" {
  value = "https://mock-endpoint.eks.amazonaws.com"
}
`,

    // ---------------------------------------------------------
    // Modules: vault
    // ---------------------------------------------------------
    "infra/terraform/modules/vault/main.tf": `
variable "environment" { type = string }

resource "random_password" "vault_token" {
  length  = 32
  special = false
}

output "VAULT_ADDR" {
  value = var.environment == "production" ? "https://vault.internal.cortexshield.com:8200" : "http://localhost:8200"
}
output "VAULT_TOKEN" {
  value     = random_password.vault_token.result
  sensitive = true
}
`,

    // ---------------------------------------------------------
    // Environments: dev
    // ---------------------------------------------------------
    "infra/terraform/environments/dev/main.tf": `
terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "random" {}

module "neo4j" {
  source                = "../../modules/neo4j-aura"
  environment           = "dev"
  tenant_isolation_mode = "shared"
}

module "qdrant" {
  source      = "../../modules/qdrant"
  environment = "dev"
}

module "postgres" {
  source      = "../../modules/postgres"
  environment = "dev"
}

module "nats" {
  source      = "../../modules/nats"
  environment = "dev"
}

module "eks" {
  source      = "../../modules/eks"
  environment = "dev"
  vpc_id      = "vpc-mock123"
  subnet_ids  = ["subnet-mock1", "subnet-mock2"]
}

module "vault" {
  source      = "../../modules/vault"
  environment = "dev"
}

output "env_vars" {
  value = <<EOT
# CortexShield Dev Environment Vars
NEO4J_URI=\${module.neo4j.NEO4J_URI}
NEO4J_USER=\${module.neo4j.NEO4J_USER}
QDRANT_URL=\${module.qdrant.QDRANT_URL}
DATABASE_URL=\${module.postgres.DATABASE_URL}
NATS_URL=\${module.nats.NATS_URL}
VAULT_ADDR=\${module.vault.VAULT_ADDR}
EOT
  sensitive = true
}
`,

    // ---------------------------------------------------------
    // Environments: staging
    // ---------------------------------------------------------
    "infra/terraform/environments/staging/main.tf": `
terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "random" {}

module "neo4j" {
  source                = "../../modules/neo4j-aura"
  environment           = "staging"
  tenant_isolation_mode = "shared"
}

module "qdrant" {
  source      = "../../modules/qdrant"
  environment = "staging"
}

module "postgres" {
  source      = "../../modules/postgres"
  environment = "staging"
}

module "nats" {
  source      = "../../modules/nats"
  environment = "staging"
}

module "eks" {
  source      = "../../modules/eks"
  environment = "staging"
  vpc_id      = "vpc-mock123"
  subnet_ids  = ["subnet-mock1", "subnet-mock2"]
}

module "vault" {
  source      = "../../modules/vault"
  environment = "staging"
}
`,

    // ---------------------------------------------------------
    // Environments: production
    // ---------------------------------------------------------
    "infra/terraform/environments/production/main.tf": `
terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "random" {}

module "neo4j" {
  source                = "../../modules/neo4j-aura"
  environment           = "production"
  tenant_isolation_mode = "dedicated"
}

module "qdrant" {
  source      = "../../modules/qdrant"
  environment = "production"
}

module "postgres" {
  source      = "../../modules/postgres"
  environment = "production"
}

module "nats" {
  source      = "../../modules/nats"
  environment = "production"
}

module "eks" {
  source      = "../../modules/eks"
  environment = "production"
  vpc_id      = "vpc-mock123"
  subnet_ids  = ["subnet-mock1", "subnet-mock2"]
}

module "vault" {
  source      = "../../modules/vault"
  environment = "production"
}
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

console.log("Terraform infrastructure scaffolded successfully.");
