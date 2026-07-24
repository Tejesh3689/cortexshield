
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
