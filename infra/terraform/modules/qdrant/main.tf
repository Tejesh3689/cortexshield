
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
