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

    // Get article links from the page
    const links = scrapeData.data?.links || [];
    const articleLinks = links
      .filter((link: string) => {
        // Filter for likely article URLs
        return (
          link.startsWith(source.url) &&
          !link.includes("/autor/") &&
          !link.includes("/tag/") &&
          !link.includes("/categoria/") &&
          !link.includes("/page/") &&
          link !== source.url &&
          link !== source.url + "/"
        );
      })
      .slice(0, 10); // Limit to 10 articles per scrape

    console.log(`Found ${articleLinks.length} article links`);

    let articlesCount = 0;
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
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 2000, // Wait for dynamic content
          }),
        });

        const articleData = await articleResponse.json();

        if (!articleResponse.ok) {
          console.error(`Failed to scrape article: ${articleUrl}`);
          continue;
        }

        let title = articleData.data?.metadata?.title || "";
        let rawContent = articleData.data?.markdown || "";
        let excerpt = articleData.data?.metadata?.description || "";
        let imageUrl = articleData.data?.metadata?.ogImage || articleData.data?.metadata?.image || null;

        // Clean up title
        title = title.split(" - ")[0].split(" | ")[0].trim();

        if (!title || title.length < 10) {
          console.log(`Skipping article with invalid title: ${articleUrl}`);
          continue;
        }

        let content = "";

        // Use AI to clean and extract article content
        if (lovableApiKey && rawContent) {
          console.log(`Cleaning article content: ${title}`);

          const cleanPrompt = source.is_foreign
            ? `Você é um editor de notícias. Extraia APENAS o conteúdo principal do artigo abaixo, removendo:
- Anúncios e links de "Remove Ads"
- Elementos de reCAPTCHA
- Controles de player de vídeo
- Menus de navegação
- Rodapés e cabeçalhos do site
- Links de compartilhamento social
- Comentários
- Conteúdo relacionado/sugerido

Depois, traduza o conteúdo limpo para Português do Brasil mantendo o tom jornalístico.

IMPORTANTE: Retorne APENAS o texto do artigo traduzido, formatado em parágrafos, sem nenhum elemento extra.

Título original: ${title}
Resumo original: ${excerpt}

Conteúdo bruto:
${rawContent.slice(0, 8000)}`
            : `Você é um editor de notícias. Extraia APENAS o conteúdo principal do artigo abaixo, removendo:
- Anúncios e links de "Remove Ads"
- Elementos de reCAPTCHA
- Controles de player de vídeo
- Menus de navegação
- Rodapés e cabeçalhos do site
- Links de compartilhamento social
- Comentários
- Conteúdo relacionado/sugerido

IMPORTANTE: Retorne APENAS o texto do artigo, formatado em parágrafos, sem nenhum elemento extra.

Título: ${title}

Conteúdo bruto:
${rawContent.slice(0, 8000)}`;

          const cleanResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "user",
                  content: cleanPrompt,
                },
              ],
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

        // Skip if no content was extracted
        if (!content || content.length < 100) {
          console.log(`Skipping article with no content: ${articleUrl}`);
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

        // Upsert article - update if exists, insert if new
        if (existingId) {
          const { error: updateError } = await supabase
            .from("articles")
            .update({
              title,
              excerpt: excerpt.slice(0, 500),
              content,
              image_url: imageUrl,
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

    console.log(`Scraping complete. Inserted ${articlesCount} articles.`);

    return new Response(
      JSON.stringify({ success: true, articlesCount }),
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
