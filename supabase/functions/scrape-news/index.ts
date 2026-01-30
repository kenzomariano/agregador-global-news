import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_foreign: boolean;
}

// Patterns that indicate non-article pages
const NON_ARTICLE_PATTERNS = [
  /\/autor\//i,
  /\/author\//i,
  /\/tag\//i,
  /\/tags\//i,
  /\/categoria\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/page\/\d+/i,
  /\/search\?/i,
  /\/search\//i,
  /\?page=/i,
  /\?sort=/i,
  /\?filter=/i,
  /\?limit=/i,
  /\/about\/?$/i,
  /\/contact\/?$/i,
  /\/privacy\/?$/i,
  /\/terms\/?$/i,
  /\/advertise\/?$/i,
  /\/subscribe\/?$/i,
  /\/login\/?$/i,
  /\/register\/?$/i,
  /\/premium\/?$/i,
  /\/archive\/?$/i,
  /\/archives\/?$/i,
  /\/topics?\/?$/i,
  /\/labels?\/?$/i,
  /\/sections?\/?$/i,
  /\/writers?\/?$/i,
  /\/contributors?\/?$/i,
  /\/#[^/]*$/,
  /\/feed\/?$/i,
  /\/rss\/?$/i,
  /\.xml$/i,
  /\.pdf$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\.gif$/i,
];

// Patterns that indicate article URLs
const ARTICLE_PATTERNS = [
  /\/\d{4}\/\d{2}\/\d{2}\//,  // Date-based URLs like /2024/01/15/
  /\/\d{4}\/\d{2}\//,         // Year/month URLs like /2024/01/
  /\/article\//i,
  /\/articles\//i,
  /\/story\//i,
  /\/stories\//i,
  /\/post\//i,
  /\/posts\//i,
  /\/news\//i,
  /\/noticia\//i,
  /\/noticias\//i,
  /\/-[a-z0-9]{6,}$/i,         // Slug with ID suffix
  /\/[a-z0-9-]+\d{5,}/i,       // Slug with numeric ID
  /watch-.*-online-\d+/i,      // Movie/TV show pages
];

function isLikelyArticleUrl(url: string, baseUrl: string): boolean {
  // Must start with the base URL
  if (!url.startsWith(baseUrl)) return false;
  
  // Must not be the homepage
  const path = url.replace(baseUrl, "").replace(/^\/+/, "");
  if (!path || path === "/" || path.length < 5) return false;
  
  // Check for non-article patterns
  for (const pattern of NON_ARTICLE_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  
  // Check for article patterns (positive signal)
  for (const pattern of ARTICLE_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  
  // Check URL structure - articles usually have longer paths with dashes
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 1) {
    const lastSegment = segments[segments.length - 1];
    // Good article slugs have multiple words separated by dashes
    const dashCount = (lastSegment.match(/-/g) || []).length;
    if (dashCount >= 2 && lastSegment.length > 20) return true;
  }
  
  return false;
}

function isValidArticleTitle(title: string, sourceName: string): boolean {
  if (!title || title.length < 15) return false;
  if (title.length > 300) return false;
  
  const lowerTitle = title.toLowerCase();
  const lowerSourceName = sourceName.toLowerCase();
  
  // Title shouldn't be just the source name
  if (lowerTitle === lowerSourceName) return false;
  if (lowerTitle.replace(/[^a-z0-9]/g, "") === lowerSourceName.replace(/[^a-z0-9]/g, "")) return false;
  
  // Skip generic titles
  const genericTitles = [
    "home", "homepage", "index", "main", "news", "latest", "trending",
    "popular", "featured", "top stories", "breaking news", "all news",
    "category", "categories", "archive", "archives", "search", "results",
    "author", "authors", "about", "contact", "privacy", "terms",
  ];
  
  for (const generic of genericTitles) {
    if (lowerTitle === generic || lowerTitle.startsWith(generic + " -") || lowerTitle.endsWith("- " + generic)) {
      return false;
    }
  }
  
  // Title should have multiple words
  const wordCount = title.split(/\s+/).length;
  if (wordCount < 3) return false;
  
  return true;
}

function extractVideoUrl(content: string): string | null {
  // YouTube patterns
  const youtubePatterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of youtubePatterns) {
    const match = content.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  // Vimeo patterns
  const vimeoPatterns = [
    /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    /https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of vimeoPatterns) {
    const match = content.match(pattern);
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }
  
  // Twitter/X video embeds
  const twitterPattern = /https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
  const twitterMatch = content.match(twitterPattern);
  if (twitterMatch) {
    return `https://platform.twitter.com/embed/Tweet.html?id=${twitterMatch[1]}`;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sourceId } = await req.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: "sourceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the source
    const { data: source, error: sourceError } = await supabase
      .from("news_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ error: "Source not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping ${source.name} from ${source.url}`);

    // Scrape the website using Firecrawl
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: source.url,
        formats: ["links", "markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: "Failed to scrape website" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scrape successful, processing links...");

    // Get article links from the page with improved filtering
    const links = scrapeData.data?.links || [];
    const baseUrl = source.url.replace(/\/+$/, "");
    
    const articleLinks = links
      .filter((link: string) => isLikelyArticleUrl(link, baseUrl))
      .slice(0, 10);

    console.log(`Found ${articleLinks.length} likely article links out of ${links.length} total`);

    let articlesCount = 0;
    let skippedCount = 0;
    const categories = ["politica", "economia", "tecnologia", "esportes", "entretenimento", "saude", "ciencia", "mundo", "brasil", "cultura"];

    for (const articleUrl of articleLinks) {
      try {
        // Check if article already exists
        const { data: existing } = await supabase
          .from("articles")
          .select("id, title")
          .eq("original_url", articleUrl)
          .maybeSingle();

        const existingId = existing?.id;

        // Scrape the article
        const articleResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: articleUrl,
            formats: ["markdown", "html"],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });

        const articleData = await articleResponse.json();

        if (!articleResponse.ok) {
          console.error(`Failed to scrape article: ${articleUrl}`);
          continue;
        }

        let title = articleData.data?.metadata?.title || "";
        let rawContent = articleData.data?.markdown || "";
        const rawHtml = articleData.data?.html || "";
        let excerpt = articleData.data?.metadata?.description || "";
        let imageUrl = articleData.data?.metadata?.ogImage || articleData.data?.metadata?.image || null;

        // Clean up title
        title = title.split(" - ")[0].split(" | ")[0].trim();

        // Validate title is a real article title
        if (!isValidArticleTitle(title, source.name)) {
          console.log(`Skipping non-article page: ${title} (${articleUrl})`);
          skippedCount++;
          continue;
        }

        // Extract video URL if present
        const videoUrl = extractVideoUrl(rawContent + rawHtml);

        let content = "";

        // Use AI to validate and clean article content
        if (lovableApiKey && rawContent) {
          console.log(`Processing article: ${title}`);

          // First, ask AI to validate if this is actually an article
          const validatePrompt = `Analise o conteúdo abaixo e responda APENAS com "SIM" ou "NAO":
É este o conteúdo de um artigo de notícias real (com corpo de texto, parágrafos, informações jornalísticas)?
Responda "NAO" se for:
- Uma página de categoria/seção
- Uma página de listagem
- Uma página de autor/perfil
- Uma homepage
- Uma página de busca
- Apenas links e títulos sem corpo de texto

Título: ${title}
Início do conteúdo: ${rawContent.slice(0, 2000)}`;

          const validateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "user", content: validatePrompt }],
            }),
          });

          if (validateResponse.ok) {
            const validateData = await validateResponse.json();
            const isArticle = validateData.choices?.[0]?.message?.content?.toUpperCase().includes("SIM");
            
            if (!isArticle) {
              console.log(`AI determined this is not an article: ${title}`);
              skippedCount++;
              continue;
            }
          }

          // Clean the content
          const cleanPrompt = source.is_foreign
            ? `Você é um editor de notícias. Extraia APENAS o conteúdo principal do artigo abaixo, removendo:
- Anúncios, banners e links de "Remove Ads"
- Elementos de reCAPTCHA e captchas
- Controles de player de vídeo e texto de legendas de player
- Menus de navegação e breadcrumbs
- Rodapés e cabeçalhos do site
- Links de compartilhamento social
- Seções de comentários
- Conteúdo relacionado/sugerido
- Texto repetido ou duplicado
- Links de navegação interna

Depois, traduza o conteúdo limpo para Português do Brasil mantendo o tom jornalístico.

IMPORTANTE: Retorne APENAS o texto do artigo traduzido, formatado em parágrafos HTML (<p>), sem nenhum elemento extra.

Título original: ${title}

Conteúdo bruto:
${rawContent.slice(0, 10000)}`
            : `Você é um editor de notícias. Extraia APENAS o conteúdo principal do artigo abaixo, removendo:
- Anúncios, banners e links de "Remove Ads"
- Elementos de reCAPTCHA e captchas
- Controles de player de vídeo e texto de legendas de player
- Menus de navegação e breadcrumbs
- Rodapés e cabeçalhos do site
- Links de compartilhamento social
- Seções de comentários
- Conteúdo relacionado/sugerido
- Texto repetido ou duplicado
- Links de navegação interna

IMPORTANTE: Retorne APENAS o texto do artigo, formatado em parágrafos HTML (<p>), sem nenhum elemento extra.

Título: ${title}

Conteúdo bruto:
${rawContent.slice(0, 10000)}`;

          const cleanResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "user", content: cleanPrompt }],
            }),
          });

          if (cleanResponse.ok) {
            const cleanData = await cleanResponse.json();
            content = cleanData.choices?.[0]?.message?.content || "";
            
            // If foreign source, also translate title and excerpt
            if (source.is_foreign && content) {
              const translateMetaResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-3-flash-preview",
                  messages: [
                    {
                      role: "system",
                      content: "Traduza para Português do Brasil. Responda em JSON: {\"title\": \"...\", \"excerpt\": \"...\"}",
                    },
                    {
                      role: "user",
                      content: `Título: ${title}\nResumo: ${excerpt}`,
                    },
                  ],
                }),
              });

              if (translateMetaResponse.ok) {
                const metaData = await translateMetaResponse.json();
                const metaContent = metaData.choices?.[0]?.message?.content || "";
                try {
                  const jsonMatch = metaContent.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.title) title = parsed.title;
                    if (parsed.excerpt) excerpt = parsed.excerpt;
                  }
                } catch (e) {
                  console.log("Could not parse translated metadata");
                }
              }
            }
          } else {
            console.error("Failed to clean content with AI");
            content = rawContent;
          }
        } else {
          content = rawContent;
        }

        // Skip if no substantial content was extracted
        if (!content || content.length < 200) {
          console.log(`Skipping article with insufficient content: ${title}`);
          skippedCount++;
          continue;
        }

        // Determine category using AI
        let category = "brasil";

        if (lovableApiKey) {
          const categoryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Classifique a notícia em UMA das categorias: ${categories.join(", ")}. Responda APENAS com o nome da categoria, sem explicações.`,
                },
                {
                  role: "user",
                  content: `Título: ${title}\nResumo: ${excerpt}`,
                },
              ],
            }),
          });

          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            const detectedCategory = categoryData.choices?.[0]?.message?.content?.toLowerCase().trim();
            if (categories.includes(detectedCategory)) {
              category = detectedCategory;
            }
          }
        }

        // Generate slug
        const slug = title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 80) + "-" + Date.now().toString(36);

        // Upsert article
        if (existingId) {
          const { error: updateError } = await supabase
            .from("articles")
            .update({
              title,
              excerpt: excerpt.slice(0, 500),
              content,
              image_url: imageUrl,
              video_url: videoUrl,
              category,
              is_translated: source.is_foreign,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId);

          if (updateError) {
            console.error(`Failed to update article: ${updateError.message}`);
            continue;
          }

          articlesCount++;
          console.log(`Updated article: ${title}`);
        } else {
          const { error: insertError } = await supabase.from("articles").insert({
            source_id: source.id,
            title,
            slug,
            excerpt: excerpt.slice(0, 500),
            content,
            image_url: imageUrl,
            video_url: videoUrl,
            original_url: articleUrl,
            category,
            is_featured: articlesCount === 0,
            is_translated: source.is_foreign,
            published_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error(`Failed to insert article: ${insertError.message}`);
            continue;
          }

          articlesCount++;
          console.log(`Inserted article: ${title}`);
        }
      } catch (error) {
        console.error(`Error processing article ${articleUrl}:`, error);
      }
    }

    console.log(`Scraping complete. Processed ${articlesCount} articles, skipped ${skippedCount} non-articles.`);

    return new Response(
      JSON.stringify({ success: true, articlesCount, skippedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});