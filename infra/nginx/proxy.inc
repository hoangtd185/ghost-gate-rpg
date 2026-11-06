# Shared by http.conf and https.conf. Named .inc so nginx's conf.d/*.conf include does not load it on its own.

# The game server does not compress its responses, and the page is about 600 KB.
gzip on;
gzip_types application/json;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # WebSocket at /ws. The server pings every 25 s, so a healthy connection never reaches this timeout.
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 120s;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Do not use $proxy_add_x_forwarded_for: the server rate limits by the FIRST address in this header,
    # and that variable keeps whatever the client sent, so anyone could fake their IP and dodge the login limit.
    proxy_set_header X-Forwarded-For $remote_addr;
}
