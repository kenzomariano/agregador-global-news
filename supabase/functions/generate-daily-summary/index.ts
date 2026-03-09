import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch top articles from last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: articles } = await supabase
      .from("articles")
      .select("title, category, excerpt, views_count")
      .gte("published_at", oneDayAgo)
      .order("views_count", { ascending: false })
      .limit(15);

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ message: "No articles to summarize" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const articlesList = articles
      .map((a, i) => `${i + 1}. [${a.category}] ${a.title} - ${a.excerpt || ""}`)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um editor de notícias do portal DESIGNE. Crie um resumo editorial do dia com exatamente 5 tópicos. 
Formato: retorne um JSON com { "title": "título do resumo", "items": ["tópico 1", "tópico 2", ...], "date": "YYYY-MM-DD" }.
Cada item deve ser uma frase curta e informativa (máx 120 chars). Não use markdown. Seja direto e jornalístico.`,
          },
          {
            role: "user",
            content: `Aqui estão as notícias mais relevantes das últimas 24h:\n\n${articlesList}\n\nCrie o resumo do dia.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "daily_summary",
              description: "Return the daily summary",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  date: { type: "string" },
                },
                required: ["title", "items", "date"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "daily_summary" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let summary: { title: string; items: string[]; date: string };

    if (toolCall?.function?.arguments) {
      summary = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error("No tool call in response");
    }

    // Save to site_settings
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: "daily_summary", value: JSON.stringify(summary), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summary error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
