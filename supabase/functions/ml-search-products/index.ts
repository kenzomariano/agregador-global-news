import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Popular ML categories in Brazil
const ML_CATEGORIES = [
  { id: "MLB1648", name: "Computação" },
  { id: "MLB1051", name: "Celulares e Telefones" },
  { id: "MLB1000", name: "Eletrônicos, Áudio e Vídeo" },
  { id: "MLB1574", name: "Casa, Móveis e Decoração" },
  { id: "MLB1276", name: "Esportes e Fitness" },
  { id: "MLB1168", name: "Brinquedos e Hobbies" },
  { id: "MLB1430", name: "Beleza e Cuidado Pessoal" },
  { id: "MLB1953", name: "Mais Categorias" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query, category, priceMin, priceMax, condition, limit = 20, offset = 0, getCategories } = body;

    // Return categories list
    if (getCategories) {
      return new Response(
        JSON.stringify({ categories: ML_CATEGORIES }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search params
    const params = new URLSearchParams({
      q: query,
      site_id: "MLB",
      limit: String(Math.min(limit, 50)),
      offset: String(offset),
    });

    // Category filter
    if (category) params.set("category", category);

    // Price range filter
    if (priceMin !== undefined && priceMin !== null && priceMin > 0) {
      params.set("price", `${priceMin}-*`);
    }
    if (priceMax !== undefined && priceMax !== null && priceMax > 0) {
      const currentPrice = params.get("price");
      if (currentPrice) {
        params.set("price", `${priceMin || 0}-${priceMax}`);
      } else {
        params.set("price", `*-${priceMax}`);
      }
    }

    // Condition filter (new or used)
    if (condition === "new") params.set("ITEM_CONDITION", "2230284");
    if (condition === "used") params.set("ITEM_CONDITION", "2230581");

    console.log(`Searching ML: ${query} (category=${category}, price=${priceMin}-${priceMax}, limit=${limit}, offset=${offset})`);

    const searchResponse = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`);
    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error(`ML search failed: ${searchResponse.status} - ${errText.slice(0, 200)}`);
      throw new Error(`ML API returned ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = (searchData.results || []).map((item: any) => ({
      ml_id: item.id,
      title: item.title,
      price: item.price,
      original_price: item.original_price,
      currency: item.currency_id,
      thumbnail: item.thumbnail?.replace("http://", "https://").replace("-I.jpg", "-O.jpg") || null,
      permalink: item.permalink,
      condition: item.condition,
      available_quantity: item.available_quantity,
      sold_quantity: item.sold_quantity,
      category_id: item.category_id,
      seller_nickname: item.seller?.nickname || null,
      shipping_free: item.shipping?.free_shipping || false,
    }));

    // Extract available filters from response
    const availableFilters = (searchData.available_filters || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      values: (f.values || []).slice(0, 10).map((v: any) => ({
        id: v.id,
        name: v.name,
        results: v.results,
      })),
    }));

    console.log(`Found ${results.length} results (total: ${searchData.paging?.total})`);

    return new Response(
      JSON.stringify({
        results,
        total: searchData.paging?.total || 0,
        offset: searchData.paging?.offset || 0,
        limit: searchData.paging?.limit || limit,
        filters: availableFilters,
        categories: ML_CATEGORIES,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ML search error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
