#!/usr/bin/env bash
# Runs in GitHub Actions: uploads the commit to S3, asks the server to deploy it through SSM and waits for the result.
# Environment: GITHUB_SHA, DEPLOY_BUCKET, DEPLOY_DOCUMENT, DEPLOY_INSTANCE_ID
set -euo pipefail

TIMEOUT_SECONDS=900
POLL_SECONDS=10

git archive --format=tar.gz HEAD | aws s3 cp - "s3://$DEPLOY_BUCKET/releases/$GITHUB_SHA.tar.gz"

COMMAND_ID=$(aws ssm send-command \
  --document-name "$DEPLOY_DOCUMENT" \
  --instance-ids "$DEPLOY_INSTANCE_ID" \
  --parameters "release=$GITHUB_SHA" \
  --comment "Deploy $GITHUB_SHA" \
  --query Command.CommandId --output text)
echo "SSM command: $COMMAND_ID"

invocation() { # field
  aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$DEPLOY_INSTANCE_ID" \
    --query "$1" --output text 2> /dev/null
}

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT_SECONDS" ]; do
  sleep "$POLL_SECONDS"
  elapsed=$((elapsed + POLL_SECONDS))
  # The invocation does not exist for the first moments after send-command.
  status=$(invocation Status || echo Pending)
  case "$status" in
    Pending | InProgress | Delayed) continue ;;
    Success)
      invocation StandardOutputContent
      echo "Deployed $GITHUB_SHA"
      exit 0
      ;;
    *)
      echo "Deploy ended with status: $status" >&2
      invocation StandardOutputContent >&2 || true
      invocation StandardErrorContent >&2 || true
      exit 1
      ;;
  esac
done

echo "Timed out after $TIMEOUT_SECONDS s waiting for the deploy. See SSM command $COMMAND_ID." >&2
exit 1
