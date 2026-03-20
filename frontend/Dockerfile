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

# Simple nginx config to serve the SPA and forward unknown paths to index.html
RUN printf 'server {\n\
    listen 4200;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 4200
