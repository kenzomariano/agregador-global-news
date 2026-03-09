import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();
    
    if (!articleId) {
      return new Response(JSON.stringify({ error: "articleId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, content, excerpt, category")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if FAQs already exist
    const { data: existingFaqs } = await supabase
      .from("article_faqs")
      .select("id")
      .eq("article_id", articleId);

    if (existingFaqs && existingFaqs.length > 0) {
      // Delete existing FAQs to regenerate
      await supabase.from("article_faqs").delete().eq("article_id", articleId);
    }

    // Prepare content for AI
    const articleContent = article.content || article.excerpt || article.title;
    const truncatedContent = articleContent.substring(0, 4000);

    // Call Lovable AI to generate FAQs
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em criar perguntas frequentes (FAQ) para artigos de notícias em português brasileiro.
Gere exatamente 4 perguntas e respostas relevantes baseadas no conteúdo do artigo.
As perguntas devem ser naturais, como um leitor faria.
As respostas devem ser concisas mas informativas (2-3 frases).
Responda APENAS em formato JSON válido.`,
          },
          {
            role: "user",
            content: `Gere 4 FAQs para este artigo:

Título: ${article.title}
Categoria: ${article.category}

Conteúdo:
${truncatedContent}

Responda em JSON com este formato exato:
{
  "faqs": [
    {"question": "Pergunta 1?", "answer": "Resposta 1."},
    {"question": "Pergunta 2?", "answer": "Resposta 2."},
    {"question": "Pergunta 3?", "answer": "Resposta 3."},
    {"question": "Pergunta 4?", "answer": "Resposta 4."}
  ]
}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_faqs",
              description: "Generate FAQ questions and answers for an article",
              parameters: {
                type: "object",
                properties: {
                  faqs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                    },
                    minItems: 1,
                    maxItems: 4,
                  },
                },
                required: ["faqs"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_faqs" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Extract FAQs from tool call response
    let faqs: Array<{ question: string; answer: string }> = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        faqs = parsed.faqs || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (faqs.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate FAQs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert FAQs into database
    const faqsToInsert = faqs.slice(0, 4).map((faq, index) => ({
      article_id: articleId,
      question: faq.question,
      answer: faq.answer,
      position: index,
    }));

    const { data: insertedFaqs, error: insertError } = await supabase
      .from("article_faqs")
      .insert(faqsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save FAQs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, faqs: insertedFaqs }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
