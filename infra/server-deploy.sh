#!/usr/bin/env bash
# Runs ON the server as root, from an unpacked release. Called by the SSM document (GitHub Actions) and by infra/deploy.sh.
# Builds the image, restarts the game (rolling back if it fails its health check), then updates nginx and the certificate.
# Environment: DOMAIN (empty serves plain HTTP).
set -euo pipefail

DOMAIN=${DOMAIN:-}
DATA_ROOT=${DATA_ROOT:-/srv/quymonquan}
HEALTH_URL=http://127.0.0.1:3000/api/health
NGINX_IMAGE=nginx:1.30.6-alpine
CERTBOT_IMAGE=certbot/certbot:v5.9.0

RELEASE_DIR=$(cd "$(dirname "$0")/.." && pwd)
SITE_TEMPLATES=$RELEASE_DIR/infra/nginx
CONF_DIR=$DATA_ROOT/nginx/conf.d
CONF_STAGING=$DATA_ROOT/nginx/conf.staging
CERTS_DIR=$DATA_ROOT/letsencrypt
WEBROOT=$DATA_ROOT/certbot-www

# A deploy that starts while another is running waits for it.
exec 9> "$DATA_ROOT/.deploy.lock"
flock 9

mkdir -p "$CONF_DIR" "$CONF_STAGING" "$CERTS_DIR" "$WEBROOT"

# Writes the site config to staging and checks it. Nothing live changes if nginx rejects it.
stage_nginx() { # http.conf | https.conf
  cp "$SITE_TEMPLATES/proxy.inc" "$CONF_STAGING/proxy.inc"
  sed "s/__DOMAIN__/$DOMAIN/g" "$SITE_TEMPLATES/$1" > "$CONF_STAGING/default.conf"
  docker run --rm --network host \
    -v "$CONF_STAGING:/etc/nginx/conf.d:ro" \
    -v "$CERTS_DIR:/etc/letsencrypt:ro" \
    -v "$WEBROOT:/var/www/certbot:ro" \
    "$NGINX_IMAGE" nginx -t
}

publish_nginx() {
  cp "$CONF_STAGING/proxy.inc" "$CONF_STAGING/default.conf" "$CONF_DIR/"
}

# docker stop sends SIGTERM and waits, so the server can flush pending pickups. Never use docker rm -f on the game.
stop_game() {
  docker stop -t 20 quymonquan > /dev/null 2>&1 || true
  docker rm quymonquan > /dev/null 2>&1 || true
}

run_game() { # image
  docker run -d --name quymonquan --restart unless-stopped \
    --env-file "$DATA_ROOT/app.env" \
    -p 127.0.0.1:3000:3000 \
    -v "$DATA_ROOT/game:/data" \
    --log-opt max-size=10m --log-opt max-file=3 \
    "$1" > /dev/null
}

wait_healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" > /dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

CERT=$CERTS_DIR/live/$DOMAIN/fullchain.pem
SITE=http.conf
if [ -n "$DOMAIN" ] && [ -f "$CERT" ]; then SITE=https.conf; fi
stage_nginx "$SITE"

docker build -t quymonquan:latest "$RELEASE_DIR"

stop_game
run_game quymonquan:latest
if ! wait_healthy; then
  echo "The new version failed its health check:" >&2
  docker logs --tail 50 quymonquan >&2 || true
  if docker image inspect quymonquan:stable > /dev/null 2>&1; then
    echo "Rolling back to the last working version." >&2
    stop_game
    run_game quymonquan:stable
    wait_healthy || echo "The rollback failed its health check too. The game is down." >&2
  fi
  exit 1
fi
docker tag quymonquan:latest quymonquan:stable

publish_nginx
docker rm -f nginx > /dev/null 2>&1 || true
docker run -d --name nginx --restart unless-stopped --network host \
  -v "$CONF_DIR:/etc/nginx/conf.d:ro" \
  -v "$CERTS_DIR:/etc/letsencrypt:ro" \
  -v "$WEBROOT:/var/www/certbot:ro" \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$NGINX_IMAGE" > /dev/null

if [ -n "$DOMAIN" ]; then
  if [ ! -f "$CERT" ]; then
    if ! docker run --rm \
      -v "$CERTS_DIR:/etc/letsencrypt" \
      -v "$WEBROOT:/var/www/certbot" \
      "$CERTBOT_IMAGE" certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
      --non-interactive --agree-tos --register-unsafely-without-email; then
      echo "No certificate for $DOMAIN: the game is running on plain HTTP. Check that the domain's A record points at this server, then deploy again." >&2
      exit 1
    fi
    stage_nginx https.conf
    publish_nginx
    docker exec nginx nginx -s reload
  fi

  # Certificates last 90 days. certbot only renews one close to expiry, so a daily run is cheap.
  cat > /etc/systemd/system/quymonquan-certbot.service <<UNIT
[Unit]
Description=Renew the game's TLS certificate
RequiresMountsFor=$DATA_ROOT
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker run --rm -v $CERTS_DIR:/etc/letsencrypt -v $WEBROOT:/var/www/certbot $CERTBOT_IMAGE renew --quiet
ExecStartPost=/usr/bin/docker exec nginx nginx -s reload
UNIT
  cat > /etc/systemd/system/quymonquan-certbot.timer <<UNIT
[Unit]
Description=Daily check for the game's TLS certificate

[Timer]
OnCalendar=daily
RandomizedDelaySec=6h
Persistent=true

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now quymonquan-certbot.timer
fi

docker image prune -f > /dev/null
echo "Deploy finished."
