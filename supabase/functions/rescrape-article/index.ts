import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoUrl(content: string): string | null {
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
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { articleId, url } = await req.json();

    if (!articleId || !url) {
      return new Response(
        JSON.stringify({ error: "articleId and url are required" }),
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

    console.log(`Re-scraping article: ${url}`);

    // Scrape the article
    const articleResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const articleData = await articleResponse.json();

    if (!articleResponse.ok) {
      console.error("Failed to scrape:", articleData);
      return new Response(
        JSON.stringify({ error: "Failed to scrape article" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let title = articleData.data?.metadata?.title || "";
    let rawContent = articleData.data?.markdown || "";
    const rawHtml = articleData.data?.html || "";
    let excerpt = articleData.data?.metadata?.description || "";
    let imageUrl = articleData.data?.metadata?.ogImage || articleData.data?.metadata?.image || null;

    // Clean up title
    title = title.split(" - ")[0].split(" | ")[0].trim();

    // Extract video URL
    const videoUrl = extractVideoUrl(rawContent + rawHtml);

    let content = rawContent;

    // Use AI to clean content
    if (lovableApiKey && rawContent) {
      const cleanPrompt = `Você é um editor de notícias. Extraia APENAS o conteúdo principal do artigo abaixo, removendo:
- Anúncios, banners e links de "Remove Ads"
- Elementos de reCAPTCHA e captchas
- Controles de player de vídeo
- Menus de navegação e breadcrumbs
- Rodapés e cabeçalhos do site
- Links de compartilhamento social
- Seções de comentários
- Conteúdo relacionado/sugerido
- Texto repetido ou duplicado

IMPORTANTE: 
1. Formate o conteúdo usando HTML semântico com:
   - <h2> para subtítulos principais
   - <h3> para subtítulos secundários
   - <p> para parágrafos
   - <blockquote> para citações
   - <ul>/<li> para listas
2. Mantenha a estrutura hierárquica do artigo
3. Retorne APENAS o HTML formatado, sem explicações

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
        content = cleanData.choices?.[0]?.message?.content || rawContent;
      }
    }

    // Update the article
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        title,
        excerpt: excerpt || null,
        content,
        image_url: imageUrl,
        video_url: videoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) {
      console.error("Failed to update article:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update article" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Article re-scraped successfully");

    return new Response(
      JSON.stringify({ success: true, title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
