variable "name" {
  description = "Prefix for resource names."
  type        = string
  default     = "quymonquan"
}

variable "region" {
  description = "AWS region. Singapore has the lowest latency to Vietnam among the long-established regions."
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "EC2 instance type. The plan fails unless AWS reports it as free tier eligible for this account and region."
  type        = string
  default     = "t3.micro"
}

variable "data_volume_gb" {
  description = "Size of the game data disk. Together with the 8 GB root disk it stays inside the 30 GB free tier allowance."
  type        = number
  default     = 10

  validation {
    condition     = var.data_volume_gb >= 1 && var.data_volume_gb <= 22
    error_message = "data_volume_gb must be between 1 and 22 to stay within 30 GB of EBS including the 8 GB root disk."
  }
}

variable "ssh_public_key_path" {
  description = "Path of the SSH public key allowed to log in as ec2-user."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidr" {
  description = "The only network allowed to reach SSH, normally your own IP, for example 203.0.113.10/32."
  type        = string

  validation {
    condition     = can(cidrhost(var.ssh_allowed_cidr, 0)) && var.ssh_allowed_cidr != "0.0.0.0/0"
    error_message = "ssh_allowed_cidr must be a valid CIDR block and must not open SSH to the whole internet."
  }
}

variable "domain" {
  description = "Domain whose DNS A record points at the public IP. Set it to serve HTTPS. Empty serves plain HTTP on the IP, which sends passwords and login tokens unencrypted."
  type        = string
  default     = ""

  validation {
    condition     = can(regex("^([a-z0-9-]+\\.)+[a-z]{2,}$", var.domain)) || var.domain == ""
    error_message = "domain must be a lowercase host name such as game.example.com, or empty."
  }
}

variable "github_oidc_subject_prefix" {
  description = "Start of the OIDC subject GitHub issues for the repository allowed to deploy. Get it with: gh api repos/OWNER/REPO/actions/oidc/customization/sub --jq .sub_claim_prefix"
  type        = string
  # This repository uses GitHub's immutable subject (owner and repository ids), so a deleted and
  # re-created repository with the same name cannot deploy. The plain form would be "repo:owner/name".
  default = "repo:hoangtd185@32231913/ghost-gate-rpg@1426446425"

  validation {
    condition     = startswith(var.github_oidc_subject_prefix, "repo:") && !strcontains(var.github_oidc_subject_prefix, "*")
    error_message = "github_oidc_subject_prefix must start with repo: and contain no wildcard."
  }
}

variable "create_github_oidc_provider" {
  description = "Set to false if this AWS account already has the GitHub Actions OIDC provider (only one is allowed per account)."
  type        = bool
  default     = true
}
