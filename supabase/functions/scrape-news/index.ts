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
          .select("id")
          .eq("original_url", articleUrl)
          .maybeSingle();

        if (existing) {
          console.log(`Article already exists: ${articleUrl}`);
          continue;
        }

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
          }),
        });

        const articleData = await articleResponse.json();

        if (!articleResponse.ok) {
          console.error(`Failed to scrape article: ${articleUrl}`);
          continue;
        }

        let title = articleData.data?.metadata?.title || "";
        let content = articleData.data?.markdown || "";
        let excerpt = articleData.data?.metadata?.description || "";
        let imageUrl = articleData.data?.metadata?.ogImage || articleData.data?.metadata?.image || null;

        // Clean up title
        title = title.split(" - ")[0].split(" | ")[0].trim();

        if (!title || title.length < 10) {
          console.log(`Skipping article with invalid title: ${articleUrl}`);
          continue;
        }

        // Translate if foreign source
        if (source.is_foreign && lovableApiKey) {
          console.log(`Translating article: ${title}`);

          const translateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  content: "Você é um tradutor profissional. Traduza o texto para Português do Brasil mantendo o tom jornalístico. Retorne APENAS a tradução, sem explicações.",
                },
                {
                  role: "user",
                  content: `Traduza para Português do Brasil:\n\nTítulo: ${title}\n\nResumo: ${excerpt}\n\nConteúdo: ${content.slice(0, 3000)}`,
                },
              ],
            }),
          });

          if (translateResponse.ok) {
            const translateData = await translateResponse.json();
            const translatedText = translateData.choices?.[0]?.message?.content || "";

            // Parse translated content
            const titleMatch = translatedText.match(/Título:\s*(.+?)(?:\n|Resumo:|$)/i);
            const excerptMatch = translatedText.match(/Resumo:\s*(.+?)(?:\n|Conteúdo:|$)/i);
            const contentMatch = translatedText.match(/Conteúdo:\s*([\s\S]+)/i);

            if (titleMatch) title = titleMatch[1].trim();
            if (excerptMatch) excerpt = excerptMatch[1].trim();
            if (contentMatch) content = contentMatch[1].trim();
          }
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

        // Insert article
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
