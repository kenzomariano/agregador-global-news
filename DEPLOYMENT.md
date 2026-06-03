# 📦 Guia de Exportação e Self-Hosting — DESIGNE

Este guia ensina, passo a passo, como **exportar o projeto do Lovable** e
**rodar em qualquer hospedagem** (Vercel, Netlify, Cloudflare Pages, Docker
em VPS, etc.) com um backend Supabase independente.

> Resumo da arquitetura
> - **Frontend**: React + Vite (SPA estático). Roda em qualquer CDN ou Nginx.
> - **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions). Pode ser Supabase Cloud, Supabase Self-Hosted (Docker) ou compatível.
> - **IA**: provedor plugável (Lovable, OpenAI, Anthropic, Gemini, OpenRouter, ou endpoint custom OpenAI-compatible). Configurado via env vars das Edge Functions.

---

## 1. Exportar o código

1. No projeto Lovable, clique em **GitHub → Connect to GitHub** e crie o repositório.
2. Clone para sua máquina:
   ```bash
   git clone https://github.com/<seu-usuario>/<seu-repo>.git
   cd <seu-repo>
   ```
3. Instale dependências:
   ```bash
   bun install      # ou: npm install
   ```

---

## 2. Provisionar o backend Supabase

Você tem **3 opções** — escolha uma:

### Opção A — Supabase Cloud (mais simples)

1. Crie projeto em https://supabase.com
2. Anote `Project URL`, `anon key`, `service_role key`, `project ref`.
3. Aplique as migrations (ver passo 3).

### Opção B — Supabase Self-Hosted (Docker)

Siga o guia oficial: https://supabase.com/docs/guides/self-hosting/docker

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# edite .env: JWT_SECRET, POSTGRES_PASSWORD, SITE_URL, etc.
docker compose up -d
```

Você terá um Supabase rodando em `http://localhost:8000` (Studio) e
`http://localhost:8000` (API gateway / Kong).

### Opção C — Outro Postgres + serviços compatíveis

Funciona com qualquer Postgres se você reimplementar Auth/Storage. Não recomendado
a menos que tenha motivo forte. As Edge Functions usam o cliente Supabase JS.

---

## 3. Aplicar as migrations no banco

Todas as migrations SQL estão em `supabase/migrations/`. Aplique-as **em ordem**.

### Via Supabase CLI (recomendado)
```bash
npm install -g supabase
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
```

### Via psql direto (self-host ou qualquer Postgres)
```bash
export DATABASE_URL="postgresql://postgres:senha@host:5432/postgres"
for f in supabase/migrations/*.sql; do
  echo ">> $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

### Após aplicar
- Habilite as extensões: `pg_cron`, `pg_net`, `unaccent`, `pgcrypto` (algumas migrations já fazem isso).
- Crie o primeiro usuário admin: cadastre-se no app e depois execute no SQL Editor:
  ```sql
  insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where email = 'seu@email.com';
  ```

---

## 4. Configurar Edge Functions

As funções estão em `supabase/functions/`. Faça o deploy:

```bash
supabase functions deploy --no-verify-jwt scrape-news
supabase functions deploy --no-verify-jwt rescrape-article
supabase functions deploy --no-verify-jwt translate-article
supabase functions deploy --no-verify-jwt tmdb-sync
supabase functions deploy --no-verify-jwt sitemap
supabase functions deploy --no-verify-jwt fetch-affiliate-products
supabase functions deploy --no-verify-jwt generate-daily-summary
supabase functions deploy --no-verify-jwt ml-oauth-callback
supabase functions deploy --no-verify-jwt ml-enrich-products
supabase functions deploy --no-verify-jwt auto-scrape
supabase functions deploy --no-verify-jwt ml-search-products
supabase functions deploy --no-verify-jwt generate-article-faq
supabase functions deploy --no-verify-jwt scrape-guide
```

### Secrets das funções

Copie `.env.functions.example` → preencha → suba:

```bash
supabase secrets set --env-file .env.functions
```

**Provedor de IA** (escolha um):

| AI_PROVIDER  | Secret obrigatório                     |
|--------------|-----------------------------------------|
| `lovable`    | `LOVABLE_API_KEY`                       |
| `openai`     | `OPENAI_API_KEY`                        |
| `anthropic`  | `ANTHROPIC_API_KEY`                     |
| `gemini`     | `GEMINI_API_KEY`                        |
| `openrouter` | `OPENROUTER_API_KEY`                    |
| `custom`     | `AI_BASE_URL` + `AI_API_KEY` (OpenAI compat) |

Opcional: `AI_DEFAULT_MODEL` para fixar o modelo padrão.

---

## 5. Configurar o frontend

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_PROJECT_ID="seu-project-ref"
```

Teste localmente:
```bash
bun run dev
# abre em http://localhost:5173
```

---

## 6. Build e deploy do frontend

O build é um SPA estático em `dist/`. Funciona em **qualquer** hospedagem.

### Build
```bash
bun run build
# saída em dist/
```

### Opção 1 — Vercel
1. Importe o repositório em https://vercel.com
2. Framework: **Vite**
3. Build command: `bun run build` (ou `npm run build`)
4. Output directory: `dist`
5. Em **Settings → Environment Variables** adicione `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
6. Adicione um arquivo `vercel.json` (já incluso) para SPA routing.

### Opção 2 — Netlify
1. Conecte o repositório
2. Build command: `bun run build` — Publish dir: `dist`
3. Adicione as env vars `VITE_*` em Site settings → Environment.
4. O arquivo `public/_redirects` já trata o SPA fallback.

### Opção 3 — Cloudflare Pages
1. Connect Git → framework preset **Vite**
2. Build command: `bun run build` — Output: `dist`
3. Adicione env vars `VITE_*` em Settings → Environment variables.

### Opção 4 — Docker em qualquer VPS

```bash
docker build -t designe-web \
  --build-arg VITE_SUPABASE_URL="https://..." \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..." \
  --build-arg VITE_SUPABASE_PROJECT_ID="ref" .

docker run -d -p 80:80 --restart unless-stopped designe-web
```

Ou via docker-compose:
```bash
cp .env.example .env   # preencha
docker compose up -d --build
# acessa em http://servidor:8080
```

Configure um reverse proxy (Caddy/Traefik/Nginx) com HTTPS na frente.

### Opção 5 — Nginx puro em VPS
```bash
bun run build
rsync -av dist/ usuario@servidor:/var/www/designe/
# Use o arquivo deploy/nginx.conf como base
```

---

## 7. Configurar cron jobs (scraping diário etc.)

Os jobs do `pg_cron` são criados automaticamente pelas migrations.
Para que façam HTTP em **self-host**, garanta que `pg_net` está habilitado
e que a URL do `net.http_post` aponta para o seu domínio Supabase
(edite via SQL Editor se mudou de host).

```sql
-- Listar jobs
SELECT jobname, schedule, command FROM cron.job;

-- Atualizar URL de um job depois da migração de host
SELECT cron.unschedule('nome-do-job');
SELECT cron.schedule('nome-do-job', '0 */3 * * *', $$ ... $$);
```

---

## 8. Domínio próprio e HTTPS

- **Vercel/Netlify/Cloudflare**: HTTPS automático ao adicionar o domínio.
- **VPS**: use Caddy (HTTPS automático via Let's Encrypt):
  ```caddy
  seusite.com {
    reverse_proxy localhost:8080
  }
  ```

---

## 9. Trocar o provedor de IA depois

Sem deploy de código — basta atualizar secrets:

```bash
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-...
# pronto, todas as Edge Functions passam a usar OpenAI
```

A camada de abstração está em `supabase/functions/_shared/ai-provider.ts`.

---

## 10. Backup e migração de dados

```bash
# Backup completo
pg_dump "$DATABASE_URL" > backup.sql

# Restaurar em outro Postgres
psql "$NEW_DATABASE_URL" < backup.sql
```

Para Storage, use o painel Supabase ou `supabase storage` CLI.

---

## ✅ Checklist de portabilidade

- [ ] Repositório clonado do GitHub
- [ ] Backend Supabase provisionado (Cloud, self-host ou compatível)
- [ ] Migrations aplicadas com sucesso
- [ ] Extensões `pg_cron`, `pg_net`, `unaccent`, `pgcrypto` habilitadas
- [ ] Admin inicial criado em `user_roles`
- [ ] Edge Functions deployadas
- [ ] Secrets das functions configuradas (IA + Firecrawl + TMDB)
- [ ] `.env` do frontend preenchido
- [ ] Build local rodando (`bun run dev`)
- [ ] Deploy do frontend na hospedagem escolhida
- [ ] DNS + HTTPS no domínio próprio
- [ ] Cron jobs ativos e apontando para o host correto

Qualquer dúvida, consulte os arquivos `.env.example`, `.env.functions.example`,
`Dockerfile`, `docker-compose.yml` e `deploy/nginx.conf` neste repositório.
