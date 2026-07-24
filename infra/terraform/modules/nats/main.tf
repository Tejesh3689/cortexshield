
variable "environment" { type = string }

output "NATS_URL" {
  value = var.environment == "production" ? "nats://nats.internal.cortexshield.com:4222" : "nats://localhost:4222"
}
