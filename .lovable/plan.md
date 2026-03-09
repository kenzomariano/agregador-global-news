
# Plano: SEO de Performance Maxima + Produtos Afiliados + Robustez

## Status: Implementado (Fase 1)

### ✅ Concluído

1. **SEO Técnico Avançado**
   - Meta `news_keywords` e `article:section` em artigos
   - JSON-LD `ItemList` nas páginas de categoria
   - Branding "DESIGNE" corrigido em TrendingPage
   - Sitemap com `<news:news>` namespace para artigos recentes (48h)

2. **Newsletter**
   - Tabela `newsletter_subscribers` criada
   - Página `/newsletter` com formulário
   - Widget compacto no sidebar da home e no footer

3. **Resumo do Dia com IA**
   - Edge function `generate-daily-summary` (Gemini Flash)
   - Componente `DailySummary` na home
   - Salvo em `site_settings` (key: `daily_summary`)

4. **Paginação**
   - CategoryPage com `?page=N` e `rel="prev/next"` para crawlers
   - SearchPage com paginação
   - Hook `useArticles` atualizado com suporte a page + count

### 🔜 Próximas Fases

- Guias Editoriais (`/guia/:slug`)
- Comparativos de Produtos (`/comparar`)
- "Salvar para ler depois"
- Rankings por período (Hoje/Semana/Mês)
- Push Notifications
