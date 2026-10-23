# Game image: installs dependencies (if any), builds the client, then runs the Node server
FROM node:22-alpine
WORKDIR /app
COPY . .
# Runtime dependencies only (dev tools such as the test browser driver are skipped).
# Installed when a package-lock.json exists; the build itself needs no packages.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; fi \
 && node tools/build.mjs \
 && mkdir -p /data && chown -R node:node /data
# TOKEN_SECRET is passed at run time (docker run -e TOKEN_SECRET=... or --env-file .env), never baked into the image
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
# run as a regular user instead of root
USER node
CMD ["node", "server/src/index.js"]
