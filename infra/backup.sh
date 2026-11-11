#!/usr/bin/env bash
# Runs ON the server as root, from the systemd timer quymonquan-backup (installed by server-deploy.sh).
# Takes a consistent snapshot of game.db inside the running game container (no downtime), keeps the newest
# KEEP_LOCAL copies on the data disk, and copies the new one to the private S3 backup bucket.
# Environment (from /etc/quymonquan-backup.env): BACKUP_BUCKET and AWS_REGION. Without a bucket only the local copy is made.
set -euo pipefail

DATA_ROOT=${DATA_ROOT:-/srv/quymonquan}
KEEP_LOCAL=${KEEP_LOCAL:-7}

docker exec quymonquan node tools/backup.mjs /data/game.db /data/backups --keep "$KEEP_LOCAL"
FILE=$(find "$DATA_ROOT/game/backups" -maxdepth 1 -name 'game-*.db.gz' | sort | tail -n 1)
[ -n "$FILE" ] || { echo "No backup file found" >&2; exit 1; }

if [ -n "${BACKUP_BUCKET:-}" ]; then
  aws s3 cp --only-show-errors --region "${AWS_REGION:?AWS_REGION is not set}" "$FILE" "s3://$BACKUP_BUCKET/backups/$(basename "$FILE")"
  echo "Uploaded $(basename "$FILE") to s3://$BACKUP_BUCKET/backups/"
else
  echo "BACKUP_BUCKET is not set: this backup only exists on the data disk." >&2
fi
