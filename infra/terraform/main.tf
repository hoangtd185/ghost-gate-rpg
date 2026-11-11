# One EC2 instance running the game in Docker behind nginx, with player data on its own EBS volume.
# See "Option 2b: AWS EC2" in README.md for the steps.

data "aws_ec2_instance_type" "game" {
  instance_type = var.instance_type
}

# Not every availability zone offers every instance type.
data "aws_ec2_instance_type_offerings" "game" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnet" "game" {
  vpc_id            = data.aws_vpc.default.id
  availability_zone = sort(data.aws_ec2_instance_type_offerings.game.locations)[0]
  default_for_az    = true
}

locals {
  architecture = contains(data.aws_ec2_instance_type.game.supported_architectures, "arm64") ? "arm64" : "x86_64"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-${local.architecture}"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_key_pair" "game" {
  key_name_prefix = "${var.name}-"
  public_key      = file(pathexpand(var.ssh_public_key_path))
}

# The game listens on 127.0.0.1:3000 only. Port 3000 must stay closed: the server trusts
# X-Forwarded-For behind the proxy, so direct access would let clients fake their IP and dodge rate limits.
resource "aws_security_group" "game" {
  name_prefix = "${var.name}-"
  description = "Game web traffic and SSH from the admin network"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP and ACME challenge"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS and secure WebSocket"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from the admin network"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Holds game.db, TOKEN_SECRET and the TLS certificates, so all of them survive instance replacement.
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.game.availability_zone
  size              = var.data_volume_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "${var.name}-data"
  }

  # Player data: "terraform destroy" stops here on purpose. See the README to remove it deliberately.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_instance" "game" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.game.id
  key_name               = aws_key_pair.game.key_name
  vpc_security_group_ids = [aws_security_group.game.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    volume_serial = replace(aws_ebs_volume.data.id, "-", "")
  })

  # T3 defaults to "unlimited", which bills for CPU above the baseline. "standard" throttles instead.
  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  tags = {
    Name = var.name
  }

  lifecycle {
    # A newer AMI must not replace a running game server on the next apply.
    ignore_changes = [ami]

    precondition {
      condition     = data.aws_ec2_instance_type.game.free_tier_eligible
      error_message = "${var.instance_type} is not free tier eligible for this account in ${var.region}. Run: aws ec2 describe-instance-types --region ${var.region} --filters Name=free-tier-eligible,Values=true --query 'InstanceTypes[].InstanceType'"
    }
  }
}

resource "aws_volume_attachment" "data" {
  device_name                    = "/dev/sdf"
  volume_id                      = aws_ebs_volume.data.id
  instance_id                    = aws_instance.game.id
  stop_instance_before_detaching = true
}

# Keeps the address (and the DNS record pointing at it) stable when the instance is replaced.
resource "aws_eip" "game" {
  domain   = "vpc"
  instance = aws_instance.game.id

  tags = {
    Name = var.name
  }
}
