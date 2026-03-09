
## Análise do Estado Atual

**Pontos Fortes já implementados:**
- SEO técnico básico: meta tags, OG, JSON-LD (NewsArticle, FAQPage, BreadcrumbList, WebSite)
- Sitemap dinâmico via Edge Function
- robots.txt com regras por bot
- lazy loading em imagens
- Sistema de categorias, tags, comentários, likes
- Página de busca interna
- TMDB para entretenimento
- Produtos afiliados

**Lacunas identificadas:**
- Apenas 11 artigos no banco (entretenimento: 7, tecnologia: 3, brasil: 1) — conteúdo muito raso
- Somente 1 fonte de notícias ativa (Screen Rant) — sem cobertura de notícias brasileiras reais
- Sem paginação — limite fixo de 20/50 artigos por query
- Sem newsletter/RSS — zero retenção de leitores
- Sem conteúdo editorial próprio (guias, comparativos, reviews)
- Sem sitemap por categoria — oportunidade de SEO perdida
- Nenhum dado estruturado de `ListItem` nas páginas de categoria
- `TrendingPage` usa "NewsHub Brasil" em vez de DESIGNE (branding inconsistente)
- Sem meta `news_keywords` que a Google News exige
- Sem Open Graph correto para páginas de categoria
- Sem fallback para leitores sem JS (SPA puro = problema para crawlers)

---

## Plano: Melhorias de Robustez, SEO e Conteúdo

### Bloco 1 — Mais Fontes de Notícias Brasileiras

Adicionar fontes de artigos reais no banco para popular o portal com conteúdo diverso:

- **G1 Globo** (sitemap: `https://g1.globo.com/dynamo/sitemap.xml`)
- **UOL Notícias** (`https://noticias.uol.com.br/`)
- **Tecnoblog** (tecnologia em PT)
- **Exame** (economia/negócios)
- **GZH Esportes** (esportes)

Essas fontes serão cadastradas via admin com `source_type: article`.

### Bloco 2 — SEO Técnico Avançado

**2.1 - Meta `news_keywords` e `article:section`**
Adicionar nos artigos a meta tag `news_keywords` (requisito Google News) e `article:section` (categoria).

**2.2 - JSON-LD ItemList nas páginas de categoria**
Adicionar dados estruturados `ItemList` na `CategoryPage` para listar artigos como rich results.

**2.3 - Corrigir branding na `TrendingPage`**
Substituir "NewsHub Brasil" por "DESIGNE" na description da SEOHead.

**2.4 - Sitemap com `<news:news>` namespace**
Expandir a Edge Function `sitemap` para incluir a extensão de notícias do Google (`news:news`, `news:title`, `news:publication_date`) nos artigos publicados nas últimas 48h.

**2.5 - Paginação nas páginas de categoria e busca**
Adicionar paginação (`?page=2`) com links `rel="prev"` e `rel="next"` para que crawlers consigam indexar todo o conteúdo.

### Bloco 3 — Novos Tipos de Conteúdo

**3.1 - Página de Rankings Semanais** (`/mais-lidas` expandida)
Criar abas: "Hoje", "Semana", "Mês" — usando campos de data + views_count.

**3.2 - Seção "Resumo do Dia"** na página inicial
Um card editorial fixo com bullets dos 5 tópicos mais relevantes do dia, gerado via IA (Gemini Flash) e salvo em `site_settings`. Atualizado 1x ao dia via edge function agendada. Excelente para SEO semântico.

**3.3 - Página de Newsletter** (`/newsletter`)
Formulário de cadastro de e-mail salvo em nova tabela `newsletter_subscribers`. Permite construir audiência direta e aumentar RPV (retorno por visita).

**3.4 - Comparativos de Produtos** (`/comparar`)
Página que compara 2-3 produtos lado a lado (da tabela `products`), com dados estruturados `Product` e `ComparisonTable` — alta intenção de compra = excelente para conversão.

**3.5 - Guias Editoriais** (`/guia/:slug`)
Nova tabela `guides` + páginas de conteúdo longo (ex: "Melhor Smartphone 2025", "Como economizar na crise"). Conteúdo evergreen com JSON-LD `HowTo` ou `Article`. Muito valorizado pelo Google.

### Bloco 4 — Retenção e Engajamento

**4.1 - Push Notification (Web Push)**
Integrar a API de Notification do navegador para que usuários se inscrevam e recebam alertas de novas notícias por categoria.

**4.2 - "Salvar para ler depois"**
Botão em cada artigo que salva na tabela `saved_articles` (vinculado ao user_id). Exibido na `/conta`.

**4.3 - Widget "Ler Próximo" automaticamente**
Ao final da leitura de um artigo, exibir o próximo artigo relacionado com auto-scroll suave — aumenta páginas/sessão.

---

## Prioridade de Implementação

```text
ALTO IMPACTO / BAIXO ESFORÇO (fazer primeiro):
  1. Adicionar fontes de notícias BR no banco
  2. Corrigir branding TrendingPage
  3. news_keywords + article:section nas meta tags
  4. JSON-LD ItemList nas páginas de categoria
  5. Sitemap com news: namespace

ALTO IMPACTO / MÉDIO ESFORÇO:
  6. Resumo do Dia com IA na home
  7. Paginação nas categorias e busca
  8. Newsletter (/newsletter + tabela)
  9. Salvar artigos na conta

MÉDIO IMPACTO / ALTO ESFORÇO:
  10. Guias Editoriais (/guia/:slug)
  11. Comparativos de Produtos
  12. Push Notification
  13. Rankings por período (Hoje/Semana/Mês)
```

---

## O que implementar agora

Sugiro começar pelo grupo de **alto impacto / baixo esforço** mais o "Resumo do Dia":

1. **Corrigir SEO técnico** — meta `news_keywords`, `article:section`, branding TrendingPage, JSON-LD ItemList
2. **Sitemap com namespace de notícias** — Edge Function atualizada
3. **Resumo do Dia com IA** — card na home gerado por Gemini, salvo em `site_settings`
4. **Newsletter** — nova tabela + página `/newsletter` + widget no footer/sidebar
5. **Paginação** — nas páginas de categoria e busca

**Banco de dados necessário:**
- Nova tabela `newsletter_subscribers` (email, confirmed_at, created_at)

**Edge Functions a atualizar:**
- `sitemap/index.ts` — adicionar `<news:news>` para artigos recentes
- Nova function `generate-daily-summary` — usa Gemini para gerar resumo do dia
