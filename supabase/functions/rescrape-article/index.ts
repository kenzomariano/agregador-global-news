import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRANSLATION_SYSTEM_PROMPT = `Traduza o título e resumo abaixo para Português do Brasil.

REGRAS DE TRADUÇÃO DE NOMES:
- Mantenha nomes de plataformas: Netflix, Disney+, HBO, Amazon Prime, Apple TV+
- SEMPRE traduza títulos de filmes/séries/animes para o nome OFICIAL no Brasil. Exemplos:
  "Crash Landing on You" → "Pousando no Amor"
  "Squid Game" → "Round 6"
  "Money Heist" → "La Casa de Papel"
  "My Love from the Star" → "Meu Amor das Estrelas"
  "Descendants of the Sun" → "Descendentes do Sol"
  "It's Okay to Not Be Okay" → "Tudo Bem Não Ser Normal"
  "All of Us Are Dead" → "Se Estivéssemos Todos Mortos"
  "Alchemy of Souls" → "Alquimia das Almas"
  "Hellbound" → "Rumo ao Inferno"
  "The Glory" → "A Glória"
  "Attack on Titan" → "Ataque dos Titãs"
  "Demon Slayer" → "Demon Slayer: Kimetsu no Yaiba"
  "My Hero Academia" → "Boku no Hero Academia"
  "Solo Leveling" → "Solo Leveling"
  "Elden Ring" → "Elden Ring"
- Se não souber o nome oficial no Brasil, traduza literalmente
- Mantenha nomes de pessoas, empresas e marcas em inglês

Responda SOMENTE com JSON válido: {"title": "...", "excerpt": "..."}`;

function extractVideoUrl(content: string): string | null {
  const youtubePatterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of youtubePatterns) {
    const match = content.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  const vimeoPatterns = [
    /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    /https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of vimeoPatterns) {
    const match = content.match(pattern);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) + "-" + Date.now().toString(36);
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

    // Get article and source info
    const { data: articleRow } = await supabase
      .from("articles")
      .select("source_id, title, excerpt, category, slug")
      .eq("id", articleId)
      .single();
    
    let isForeign = false;
    let sourceUrl = "";
    if (articleRow?.source_id) {
      const { data: sourceRow } = await supabase
        .from("news_sources")
        .select("is_foreign, url")
        .eq("id", articleRow.source_id)
        .single();
      isForeign = sourceRow?.is_foreign || false;
      sourceUrl = (sourceRow?.url || "").toLowerCase();
    }

    const oldSlug = articleRow?.slug || "";
    console.log(`Re-scraping article: ${url} (foreign=${isForeign})`);

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

    title = title.split(" - ")[0].split(" | ")[0].trim();
    const videoUrl = extractVideoUrl(rawContent + rawHtml);
    let content = rawContent;

    // Detect source-specific noise
    const isOtakukart = sourceUrl.includes("otakukart");
    const sourceSpecificRules = isOtakukart ? `
REGRAS ESPECÍFICAS PARA OTAKUKART:
- REMOVA completamente: menus do site como "Anime", "Manga", "K-Drama", "Korean", "K-Pop", "Kdrama", "Reviews", "News"
- REMOVA listas de navegação do tipo: "Home > Anime > ..."
- REMOVA rodapés com links para redes sociais, "About Us", "Contact", "Privacy Policy"
- REMOVA seções de "Trending", "Popular", "Recent Posts", "You May Also Like"
- REMOVA menções a "OtakuKart" como portal/site
- REMOVA créditos de imagens como "Image Courtesy: ..."
- REMOVA completamente qualquer sidebar ou conteúdo de navegação lateral
` : "";

    // Use AI to clean content and translate if needed
    if (lovableApiKey && rawContent) {
      const cleanPrompt = `Você é um editor de notícias profissional brasileiro.

TAREFA: Extraia APENAS o corpo principal do artigo e ${isForeign ? "TRADUZA COMPLETAMENTE para Português do Brasil. NENHUMA frase deve permanecer em inglês." : "mantenha em Português"}.
${sourceSpecificRules}
REMOVA COMPLETAMENTE (NÃO INCLUA NO RESULTADO):
- Anúncios, banners, links de "Remove Ads", promoções
- Elementos de reCAPTCHA, captchas, popups
- Controles de player de vídeo e texto de legendas de player
- Menus de navegação, breadcrumbs, sidebar, header e footer do site
- Rodapés e cabeçalhos do site (incluindo links para seções do portal)
- Links de compartilhamento social e botões de redes sociais
- Seções de comentários e formulários
- Conteúdo relacionado/sugerido, "Leia também", "Related Stories", "You May Also Like"
- Texto repetido, duplicado ou spam
- Links de navegação interna e paginação
- Avisos de cookies e GDPR
- Conteúdo de lista de categorias ou índices
- Cards de outros artigos ou notícias relacionadas
- Listas de links para outras seções do site
- Informações sobre outros filmes/séries que não são o foco do artigo
- Botões como "Read More", "Continue Reading", "Subscribe"
- Qualquer elemento de UI que não seja parte do texto do artigo
- Listas de episódios ou índices de conteúdo que não fazem parte do artigo
- Texto promocional como "Sign up for our newsletter"
- Créditos de imagens, "Image Courtesy", "Source:", "Credits:"
- Disclaimers e avisos legais do portal

FORMATE o conteúdo usando HTML semântico:
- <h2> para subtítulos principais
- <h3> para subtítulos secundários
- <p> para parágrafos de texto
- <blockquote> para citações
- <ul>/<li> para listas APENAS se fizerem parte do conteúdo
- <strong> para destaques importantes
- <em> para ênfase

REGRAS CRÍTICAS:
1. NÃO inclua o título principal
2. Se o conteúdo estiver em inglês ou outro idioma, TRADUZA TUDO para Português do Brasil
3. Retorne APENAS o HTML formatado, sem explicações
4. NÃO inclua cards de navegação ou listas de links

Título original: ${title}

Conteúdo bruto:
${rawContent.slice(0, 12000)}`;

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
        content = content.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      content,
      image_url: imageUrl,
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    };

    // For foreign sources, translate title/excerpt, update slug, recategorize
    if (isForeign && lovableApiKey) {
      // Translate title and excerpt
      const commonEnglishWords = /\b(the|and|for|with|that|from|have|this|will|about|director|takes|netflix|series|movie|film|show|season|streaming|star|episode|cast|trailer|release)\b/gi;
      const enMatches = (title + " " + excerpt).match(commonEnglishWords) || [];
      const titleWords = (title + " " + excerpt).split(/\s+/).length;
      const enWordRatio = enMatches.length / Math.max(titleWords, 1);

      if (enWordRatio > 0.1) {
        console.log(`Translating title (enRatio=${(enWordRatio * 100).toFixed(0)}%): ${title.slice(0, 60)}`);
        try {
          const translateResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
                { role: "user", content: `Título: ${title}\nResumo: ${excerpt}` },
              ],
            }),
          });
          if (translateResp.ok) {
            const tData = await translateResp.json();
            const tContent = (tData.choices?.[0]?.message?.content || "").replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
            const jsonMatch = tContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.title && parsed.title.length > 5) {
                console.log(`Title translated: "${title}" → "${parsed.title}"`);
                title = parsed.title;
              }
              if (parsed.excerpt && parsed.excerpt.length > 5) excerpt = parsed.excerpt;
            }
          }
        } catch (e) {
          console.log(`Title translation failed: ${e}`);
        }
      }

      updateData.title = title;
      updateData.excerpt = excerpt;

      // Generate new slug from translated title and create redirect
      const newSlug = generateSlug(title);
      if (oldSlug && oldSlug !== newSlug) {
        updateData.slug = newSlug;
        console.log(`Slug updated: "${oldSlug}" → "${newSlug}"`);
        
        // Create redirect from old slug to new slug
        try {
          await supabase.from("article_redirects").insert({
            article_id: articleId,
            old_slug: oldSlug,
            new_slug: newSlug,
          });
          console.log(`Redirect created: ${oldSlug} → ${newSlug}`);
        } catch (e) {
          console.log(`Failed to create redirect: ${e}`);
        }
      }

      // Recategorize
      const categories = ["politica", "economia", "tecnologia", "esportes", "entretenimento", "saude", "ciencia", "mundo", "brasil", "cultura"];
      try {
        const catResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Classifique a notícia em UMA categoria. Responda APENAS com a categoria, nada mais.
Categorias: ${categories.join(", ")}
REGRAS: entretenimento = filmes, séries, TV, streaming, Netflix, celebridades, música, anime, K-drama. esportes = futebol, basquete, jogos (games). tecnologia = gadgets, apps, IA. Use "brasil" APENAS para assuntos nacionais genéricos.`,
              },
              { role: "user", content: `Título: ${title}\n${content.slice(0, 1000)}` },
            ],
          }),
        });
        if (catResp.ok) {
          const catData = await catResp.json();
          const cat = (catData.choices?.[0]?.message?.content || "").toLowerCase().trim();
          if (categories.includes(cat)) {
            console.log(`Recategorized: ${articleRow?.category} → ${cat}`);
            updateData.category = cat;
          }
        }
      } catch (e) {
        console.log(`Recategorization failed: ${e}`);
      }

      updateData.is_translated = true;
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update(updateData)
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
      JSON.stringify({ success: true, title, slug: updateData.slug || oldSlug }),
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
