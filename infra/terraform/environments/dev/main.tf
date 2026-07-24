
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
NEO4J_URI=${module.neo4j.NEO4J_URI}
NEO4J_USER=${module.neo4j.NEO4J_USER}
QDRANT_URL=${module.qdrant.QDRANT_URL}
DATABASE_URL=${module.postgres.DATABASE_URL}
NATS_URL=${module.nats.NATS_URL}
VAULT_ADDR=${module.vault.VAULT_ADDR}
EOT
  sensitive = true
}
