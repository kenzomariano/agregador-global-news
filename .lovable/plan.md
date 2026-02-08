

# Plano: SEO de Performance Maxima + Produtos Afiliados (Mercado Livre e Shopee)

## Resumo

Este plano aborda duas frentes: (1) otimizacoes de SEO para maximizar trafego organico e (2) integracao de produtos com links de afiliado do Mercado Livre e Shopee, configurados pelo administrador.

---

## Parte 1: SEO de Alta Performance

### 1.1 - Corrigir `index.html` com meta tags base

O arquivo `index.html` ainda tem os valores padrao do Lovable ("Lovable App"). Atualizar para:
- `lang="pt-BR"`
- Title: "DESIGNE - Noticias do Brasil e do Mundo"
- Description relevante
- Open Graph com dados reais do site

### 1.2 - Corrigir branding inconsistente

O `SEOHead` e o `Footer` ainda referenciam "NewsHub Brasil" em vez de "DESIGNE". Unificar toda a marca:
- `SEOHead.tsx`: trocar "NewsHub Brasil" por "DESIGNE" em og:site_name, author, JSON-LD publisher
- `Footer.tsx`: corrigir logo (letra "N" -> "D"), nome e textos para "DESIGNE"

### 1.3 - Melhorar JSON-LD com BreadcrumbList

Adicionar dados estruturados de breadcrumb no `ArticlePage` para melhorar rich snippets no Google.

### 1.4 - Adicionar sitemap.xml e robots.txt otimizados

Atualizar `public/robots.txt` com regras adequadas e referencia ao sitemap. Como o site e SPA, criar uma edge function `sitemap` que gera o sitemap.xml dinamicamente a partir dos artigos no banco.

### 1.5 - Lazy loading de imagens e `loading="lazy"`

Adicionar `loading="lazy"` nas imagens dos `ArticleCard` e na pagina de produtos para melhorar Core Web Vitals.

---

## Parte 2: Produtos Afiliados - Mercado Livre e Shopee

### 2.1 - Adicionar campos de afiliado nas configuracoes do admin

Na tabela `site_settings`, adicionar campos para que o administrador configure:
- `affiliate_mercadolivre_id` - ID/tag de afiliado do Mercado Livre
- `affiliate_shopee_id` - ID/tag de afiliado da Shopee

Esses campos serao adicionados ao `SiteSettingsManager.tsx` em um novo card "Programas de Afiliados".

### 2.2 - Criar edge function `fetch-affiliate-products`

Uma nova edge function que busca promocoes relevantes via Perplexity AI (ja conectada ao projeto como conector):
- Recebe categoria/termo de busca
- Usa Perplexity para buscar as melhores ofertas atuais no Mercado Livre e Shopee
- Retorna lista de produtos com nome, preco, imagem e link
- Aplica automaticamente o codigo de afiliado do admin nos links

### 2.3 - Componente `AffiliateProducts`

Criar um componente que exibe produtos afiliados de forma atrativa:
- Card com imagem, titulo, preco original vs preco promocional, badge de desconto
- Links de saida com tag de afiliado
- Exibido na sidebar e na pagina de produtos
- Destaque para "Ofertas do Dia" na pagina inicial

### 2.4 - Integrar na pagina de produtos

Reformular a pagina `/produtos` para ter duas secoes:
- **Ofertas em Destaque**: produtos afiliados do Mercado Livre e Shopee buscados via IA
- **Produtos Scraped**: os produtos ja existentes da tabela `products`

### 2.5 - Adicionar produtos afiliados na sidebar de artigos

Na `ArticlePage`, exibir 2-3 produtos afiliados relevantes na sidebar, baseados na categoria do artigo.

---

## Detalhes Tecnicos

### Arquivos a criar:
- `supabase/functions/fetch-affiliate-products/index.ts` - Edge function com Perplexity
- `supabase/functions/sitemap/index.ts` - Sitemap XML dinamico
- `src/components/products/AffiliateProducts.tsx` - Componente de exibicao
- `src/hooks/useAffiliateProducts.ts` - Hook para buscar ofertas

### Arquivos a modificar:
- `index.html` - Meta tags base em PT-BR
- `src/components/seo/SEOHead.tsx` - Branding "DESIGNE", melhorias JSON-LD
- `src/components/layout/Footer.tsx` - Branding correto
- `src/components/admin/SiteSettingsManager.tsx` - Campos de afiliado
- `src/pages/ProductsPage.tsx` - Secao de afiliados
- `src/pages/ArticlePage.tsx` - Afiliados na sidebar
- `src/pages/Index.tsx` - Secao "Ofertas do Dia"
- `src/components/news/ArticleCard.tsx` - `loading="lazy"` em imagens
- `public/robots.txt` - Otimizar para crawlers

### Fluxo do sistema de afiliados:

```text
Admin configura IDs de afiliado
        |
        v
Edge Function recebe categoria/busca
        |
        v
Perplexity busca ofertas reais
(Mercado Livre + Shopee)
        |
        v
Aplica tag de afiliado nos links
        |
        v
Frontend exibe produtos com precos
e botao "Comprar" com link afiliado
```

### Formato dos links de afiliado:
- **Mercado Livre**: `https://produto.mercadolivre.com.br/...?matt_tool={affiliate_id}`
- **Shopee**: `https://shopee.com.br/...?af_id={affiliate_id}`

