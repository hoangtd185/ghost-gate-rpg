#!/usr/bin/env bash
# Manual deploy over SSH, for when GitHub Actions is not an option. Pushing to main deploys automatically.
# Ships the committed code (git HEAD) and runs infra/server-deploy.sh on the server.
# Usage: infra/deploy.sh         SSH_KEY=~/.ssh/other_key infra/deploy.sh
set -euo pipefail

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
TF_DIR="$ROOT/infra/terraform"
HOST=$(terraform -chdir="$TF_DIR" output -raw public_ip)
DOMAIN=$(terraform -chdir="$TF_DIR" output -raw domain)
BACKUP_BUCKET=$(terraform -chdir="$TF_DIR" output -raw backup_bucket)
REGION=$(terraform -chdir="$TF_DIR" output -raw region)
URL=$(terraform -chdir="$TF_DIR" output -raw game_url)

SSH=(ssh -o StrictHostKeyChecking=accept-new)
if [ -n "${SSH_KEY:-}" ]; then SSH+=(-i "$SSH_KEY"); fi
SSH+=("ec2-user@$HOST")

if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]; then
  echo "Warning: uncommitted changes are not deployed, only $(git -C "$ROOT" rev-parse --short HEAD)." >&2
fi

echo "Waiting for the first-boot setup to finish..."
"${SSH[@]}" 'cloud-init status --wait > /dev/null'

echo "Uploading $(git -C "$ROOT" rev-parse --short HEAD)..."
git -C "$ROOT" archive --format=tar HEAD | "${SSH[@]}" 'rm -rf ~/app && mkdir ~/app && tar -x -C ~/app'

"${SSH[@]}" "sudo DOMAIN='$DOMAIN' BACKUP_BUCKET='$BACKUP_BUCKET' AWS_REGION='$REGION' bash ~/app/infra/server-deploy.sh"

echo "Deployed: $URL"
