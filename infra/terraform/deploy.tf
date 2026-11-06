# Automatic deploys: GitHub Actions uploads a release to S3 and runs one fixed SSM document on the instance.
# No SSH port, stored AWS keys or GitHub credentials are involved.

data "aws_caller_identity" "current" {}

locals {
  release_prefix = "releases"
}

# --- Release storage ---

resource "aws_s3_bucket" "releases" {
  bucket_prefix = "${var.name}-releases-"
  # Holds only source archives that can be rebuilt from git.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "releases" {
  bucket                  = aws_s3_bucket.releases.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "releases" {
  bucket = aws_s3_bucket.releases.id

  rule {
    id     = "expire-old-releases"
    status = "Enabled"

    filter {
      prefix = "${local.release_prefix}/"
    }

    expiration {
      days = 14
    }
  }
}

# --- The instance: SSM agent access and read-only access to releases ---

data "aws_iam_policy_document" "instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name_prefix        = "${var.name}-instance-"
  assume_role_policy = data.aws_iam_policy_document.instance_assume.json
}

resource "aws_iam_role_policy_attachment" "instance_ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "instance_releases" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.releases.arn}/${local.release_prefix}/*"]
  }
}

resource "aws_iam_role_policy" "instance_releases" {
  name_prefix = "read-releases-"
  role        = aws_iam_role.instance.id
  policy      = data.aws_iam_policy_document.instance_releases.json
}

resource "aws_iam_instance_profile" "instance" {
  name_prefix = "${var.name}-"
  role        = aws_iam_role.instance.name
}

# --- The only command GitHub Actions may run on the instance ---

resource "aws_ssm_document" "deploy" {
  name            = "${var.name}-deploy"
  document_type   = "Command"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy one release of the game from S3"
    parameters = {
      release = {
        type           = "String"
        description    = "Full git commit id"
        allowedPattern = "^[0-9a-f]{40}$"
      }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        timeoutSeconds = "900"
        runCommand = [
          "set -eu",
          "export HOME=/root",
          "cloud-init status --wait > /dev/null",
          "aws s3 cp --region ${var.region} s3://${aws_s3_bucket.releases.id}/${local.release_prefix}/{{release}}.tar.gz /tmp/quymonquan-release.tar.gz",
          "rm -rf /opt/quymonquan/release",
          "mkdir -p /opt/quymonquan/release",
          "tar -xzf /tmp/quymonquan-release.tar.gz -C /opt/quymonquan/release",
          "rm -f /tmp/quymonquan-release.tar.gz",
          "DOMAIN='${var.domain}' bash /opt/quymonquan/release/infra/server-deploy.sh",
        ]
      }
    }]
  })
}

# --- GitHub Actions: short-lived credentials through OIDC, for the main branch of one repository ---

# An AWS account can hold only one provider for this URL.
resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_github_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${var.github_oidc_subject_prefix}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name_prefix        = "${var.name}-github-"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "UploadRelease"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.releases.arn}/${local.release_prefix}/*"]
  }

  statement {
    sid     = "RunDeployDocumentOnGameInstance"
    actions = ["ssm:SendCommand"]
    resources = [
      aws_ssm_document.deploy.arn,
      aws_instance.game.arn,
    ]
  }

  statement {
    sid       = "ReadCommandResult"
    actions   = ["ssm:GetCommandInvocation"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name_prefix = "deploy-"
  role        = aws_iam_role.github_deploy.id
  policy      = data.aws_iam_policy_document.github_deploy.json
}
