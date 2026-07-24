
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
