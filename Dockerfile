# Image chạy game: build client rồi chạy server Node (không cần npm install vì không có thư viện ngoài)
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN node tools/build.mjs && mkdir -p /data && chown -R node:node /data
# TOKEN_SECRET truyền vào lúc chạy (docker run -e TOKEN_SECRET=... hoặc --env-file .env), không ghi vào image
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
# chạy bằng user thường thay vì root
USER node
CMD ["node", "server/src/index.js"]
