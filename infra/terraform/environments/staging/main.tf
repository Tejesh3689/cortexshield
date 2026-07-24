
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
