
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
