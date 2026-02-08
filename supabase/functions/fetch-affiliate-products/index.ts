import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { category = "ofertas", limit = 6 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get affiliate IDs from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["affiliate_mercadolivre_id", "affiliate_shopee_id"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const mlId = settingsMap.affiliate_mercadolivre_id || "";
    const shopeeId = settingsMap.affiliate_shopee_id || "";

    // Use Lovable AI to generate relevant product suggestions
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um assistente que gera dados de produtos em promoção para um portal de notícias brasileiro. 
Gere exatamente ${limit} produtos em promoção relevantes para a categoria "${category}".
Para cada produto, gere dados realistas de ofertas que poderiam ser encontradas no Mercado Livre ou Shopee.

Responda APENAS com um array JSON válido, sem markdown, sem explicações. Cada item deve ter:
- "name": nome do produto (string)
- "description": descrição curta (string)
- "price": preço original em reais (number)
- "sale_price": preço promocional em reais (number) 
- "discount_percent": percentual de desconto (number)
- "store": "mercadolivre" ou "shopee" (string, alterne entre os dois)
- "category": categoria do produto (string)
- "image_keyword": palavra-chave para representar o produto (string)

Exemplos de categorias de produtos relevantes para "${category}":
- Se for "tecnologia": smartphones, notebooks, fones, gadgets
- Se for "esportes": tênis, equipamentos, roupas esportivas
- Se for "ofertas": mix dos melhores produtos em promoção
- Se for "saude": suplementos, equipamentos fitness
- Adapte para a categoria fornecida.`;

    const aiResponse = await fetch("https://ai.lovable.dev/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI response error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse AI response - handle markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    let rawProducts: any[] = [];
    try {
      rawProducts = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI products:", e, cleanContent);
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply affiliate links
    const products = rawProducts.map((p: any) => {
      const searchTerm = encodeURIComponent(p.name);
      let affiliate_url = "";
      
      if (p.store === "mercadolivre") {
        affiliate_url = `https://lista.mercadolivre.com.br/${searchTerm}`;
        if (mlId) {
          affiliate_url += `?matt_tool=${mlId}&matt_word=${searchTerm}`;
        }
      } else {
        affiliate_url = `https://shopee.com.br/search?keyword=${searchTerm}`;
        if (shopeeId) {
          affiliate_url += `&af_id=${shopeeId}`;
        }
      }

      return {
        name: p.name,
        description: p.description,
        price: p.price,
        sale_price: p.sale_price,
        discount_percent: p.discount_percent,
        store: p.store,
        category: p.category,
        affiliate_url,
        image_keyword: p.image_keyword,
      };
    });

    console.log(`Generated ${products.length} affiliate products for category: ${category}`);

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-affiliate-products:", error);
    return new Response(JSON.stringify({ products: [], error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
