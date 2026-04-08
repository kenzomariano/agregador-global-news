import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_SUBCATEGORIES = ["anime", "streaming", "novela", "serie", "filme", "cinema", "musica", "celebridades", "games", "kdrama"];

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

CLASSIFICAÇÃO DE SUBCATEGORIA:
Analise o conteúdo e classifique em UMA das subcategorias abaixo (ou null se não se aplicar):
- "anime" → Anime japonês, mangá, light novel
- "kdrama" → Doramas coreanos, K-drama
- "serie" → Séries de TV em geral (exceto anime e kdrama)
- "filme" → Filmes específicos, lançamentos, reviews
- "cinema" → Indústria cinematográfica, bilheteria, festivais
- "streaming" → Notícias sobre plataformas de streaming (Netflix, Disney+, etc)
- "novela" → Telenovelas brasileiras
- "musica" → Música, shows, álbuns, artistas
- "celebridades" → Fofocas, vida de celebridades
- "games" → Videogames, jogos, consoles

Responda SOMENTE com JSON válido: {"title": "...", "excerpt": "...", "subcategory": "..." ou null}`;

const CONTENT_TRANSLATION_PROMPT = `Você é um tradutor profissional de notícias para Português do Brasil.

TAREFA: Traduza o conteúdo HTML abaixo COMPLETAMENTE para Português do Brasil.

REGRAS:
- Traduza TODO o texto para Português do Brasil. NENHUMA frase deve permanecer em inglês.
- MANTENHA toda a estrutura HTML intacta (tags, atributos)
- Use nomes oficiais no Brasil para filmes, séries, animes (ex: "Squid Game" → "Round 6")
- Mantenha nomes de pessoas, empresas, plataformas e marcas em inglês
- Retorne APENAS o HTML traduzido, sem explicações ou marcação extra`;

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
    const { articleId } = await req.json();

    if (!articleId) {
      return new Response(
        JSON.stringify({ error: "articleId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get article data
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, excerpt, content, slug, source_id")
      .eq("id", articleId)
      .single();

    if (fetchError || !article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldSlug = article.slug;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      is_translated: true,
    };

    // 1. Translate title and excerpt
    console.log(`Translating title: ${article.title.slice(0, 60)}`);
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
            { role: "user", content: `Título: ${article.title}\nResumo: ${article.excerpt || ""}` },
          ],
        }),
      });

      if (translateResp.ok) {
        const tData = await translateResp.json();
        const tContent = (tData.choices?.[0]?.message?.content || "")
          .replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonMatch = tContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.title.length > 5) {
            console.log(`Title: "${article.title}" → "${parsed.title}"`);
            updateData.title = parsed.title;
          }
          if (parsed.excerpt && parsed.excerpt.length > 5) {
            updateData.excerpt = parsed.excerpt;
          }
        }
      }
    } catch (e) {
      console.error(`Title translation failed: ${e}`);
    }

    // 2. Translate content if present
    if (article.content) {
      console.log(`Translating content (${article.content.length} chars)...`);
      try {
        const contentResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: CONTENT_TRANSLATION_PROMPT },
              { role: "user", content: article.content.slice(0, 15000) },
            ],
          }),
        });

        if (contentResp.ok) {
          const cData = await contentResp.json();
          let translated = cData.choices?.[0]?.message?.content || "";
          translated = translated.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
          if (translated.length > 50) {
            updateData.content = translated;
            console.log(`Content translated (${translated.length} chars)`);
          }
        }
      } catch (e) {
        console.error(`Content translation failed: ${e}`);
      }
    }

    // 3. Update slug if title changed
    if (updateData.title) {
      const newSlug = generateSlug(updateData.title as string);
      updateData.slug = newSlug;
      console.log(`Slug: "${oldSlug}" → "${newSlug}"`);

      // Create redirect
      try {
        await supabase.from("article_redirects").insert({
          article_id: articleId,
          old_slug: oldSlug,
          new_slug: newSlug,
        });
      } catch (e) {
        console.log(`Redirect insert failed: ${e}`);
      }
    }

    // 4. Save
    const { error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", articleId);

    if (updateError) {
      console.error("Update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update article" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Article translated successfully: ${articleId}`);
    return new Response(
      JSON.stringify({ success: true, title: updateData.title || article.title }),
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
