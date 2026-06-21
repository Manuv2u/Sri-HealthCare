# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build:prod

# ── Stage 2: serve via nginx ──────────────────────────────────────────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist/sri-diagnostic-lab/browser /usr/share/nginx/html

# Nginx config: serve SPA on both ports and proxy /api/ to backend container
# Port 4200 = local dev (docker-compose.yml maps 4200:4200)
# Port 80   = production (docker-compose.prod.yml maps 80:80)
RUN printf 'server {\n\
    listen 4200;\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location /api/ {\n\
        proxy_pass http://backend:8000/api/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_read_timeout 30s;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 4200 80
