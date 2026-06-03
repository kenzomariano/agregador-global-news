# ============================================================
# Stage 1 — Build do frontend (Vite + React)
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências (cache eficiente)
COPY package.json bun.lock* package-lock.json* ./
RUN npm install -g bun && bun install --frozen-lockfile || npm install

# Copia o restante do código
COPY . .

# Variáveis VITE_* precisam estar disponíveis no build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN bun run build || npm run build

# ============================================================
# Stage 2 — Servir como SPA estático com Nginx
# ============================================================
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
