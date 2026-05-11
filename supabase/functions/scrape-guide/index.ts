import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você converte um artigo/tutorial em um GUIA EDITORIAL estruturado em Português do Brasil.

Responda SOMENTE com JSON válido neste formato:
{
  "title": "string (máx 100 chars)",
  "excerpt": "string (resumo de 1-2 frases, máx 200 chars)",
  "category": "geral | tecnologia | financas | saude | viagem | culinaria | educacao | entretenimento",
  "image_url": "string (url da imagem principal, se houver)",
  "steps": [{ "title": "string curto", "description": "string com instrução clara" }],
  "content": "string em markdown com a explicação completa"
}

Regras:
- Sempre traduza para PT-BR mantendo nomes próprios.
- Crie de 3 a 10 passos práticos.
- Não invente conteúdo: baseie-se apenas no texto fornecido.`;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url: string | undefined = body?.url;
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Scrape with Firecrawl
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!fcKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fcKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!scrapeRes.ok) {
      const t = await scrapeRes.text();
      throw new Error(`Firecrawl falhou: ${t}`);
    }
    const scrapeJson = await scrapeRes.json();
    const markdown: string = scrapeJson?.data?.markdown || "";
    const meta = scrapeJson?.data?.metadata || {};
    if (!markdown.trim()) throw new Error("Não foi possível extrair conteúdo da página");

    // 2) Convert to structured guide via Lovable AI
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `URL: ${url}\nTítulo original: ${meta?.title || ""}\nImagem original: ${meta?.ogImage || ""}\n\nConteúdo:\n${markdown.substring(0, 12000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI Gateway falhou: ${t}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI não retornou conteúdo");

    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("AI retornou JSON inválido");
    }

    const title = (parsed.title || meta?.title || "Guia importado").substring(0, 200);
    const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;

    // 3) Insert as draft
    const { data: inserted, error: insertError } = await supabase
      .from("guides")
      .insert({
        title,
        slug,
        excerpt: parsed.excerpt || null,
        content: parsed.content || markdown.substring(0, 5000),
        image_url: parsed.image_url || meta?.ogImage || null,
        category: parsed.category || "geral",
        author_name: "Equipe DESIGNE",
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        is_published: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ guide: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("scrape-guide error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
