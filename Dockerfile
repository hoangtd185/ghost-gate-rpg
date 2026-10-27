# Game image: installs the runtime dependencies, builds the client, then runs the Node server
FROM node:22-alpine
WORKDIR /app
COPY . .
# Runtime dependencies only (ws); dev tools such as the test browser driver are skipped
RUN npm ci --omit=dev \
 && node tools/build.mjs \
 && mkdir -p /data && chown -R node:node /data
# TOKEN_SECRET is passed at run time (docker run -e TOKEN_SECRET=... or --env-file .env), never baked into the image
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
# run as a regular user instead of root
USER node
CMD ["node", "server/src/index.js"]
