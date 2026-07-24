
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

# Mocking EKS cluster for plan success
output "cluster_name" {
  value = "cortexshield-${var.environment}-eks"
}
output "cluster_endpoint" {
  value = "https://mock-endpoint.eks.amazonaws.com"
}
