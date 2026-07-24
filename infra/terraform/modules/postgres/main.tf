
variable "environment" { type = string }

resource "random_password" "pg_password" {
  length  = 16
  special = false
}

# Simulating Neon/RDS connection string
output "DATABASE_URL" {
  value     = var.environment == "production" ? "postgresql://cortex:${random_password.pg_password.result}@prod-db.us-east-1.rds.amazonaws.com:5432/cortexshield" : "postgresql://cortex:localdevpassword@localhost:5432/cortexshield"
  sensitive = true
}
