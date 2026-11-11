output "public_ip" {
  description = "Elastic IP. Point the domain's DNS A record here."
  value       = aws_eip.game.public_ip
}

output "game_url" {
  description = "Address of the game after the first deploy."
  value       = var.domain != "" ? "https://${var.domain}" : "http://${aws_eip.game.public_ip}"
}

output "ssh_command" {
  description = "Log in to the server."
  value       = "ssh ec2-user@${aws_eip.game.public_ip}"
}

output "domain" {
  description = "Domain served over HTTPS. Empty means plain HTTP."
  value       = var.domain
}

output "region" {
  description = "AWS region of the server and the buckets."
  value       = var.region
}

output "backup_bucket" {
  description = "S3 bucket with the nightly database backups."
  value       = aws_s3_bucket.backups.id
}

output "instance_id" {
  description = "EC2 instance id."
  value       = aws_instance.game.id
}

output "data_volume_id" {
  description = "EBS volume holding the player data."
  value       = aws_ebs_volume.data.id
}

output "github_variables" {
  description = "Repository variables the deploy job in .github/workflows/ci.yml needs."
  value = {
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.github_deploy.arn
    AWS_REGION          = var.region
    DEPLOY_BUCKET       = aws_s3_bucket.releases.id
    DEPLOY_DOCUMENT     = aws_ssm_document.deploy.name
    DEPLOY_INSTANCE_ID  = aws_instance.game.id
  }
}
