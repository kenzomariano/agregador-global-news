import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, category, limit = 20, offset = 0 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search ML public API (no auth needed for search)
    const params = new URLSearchParams({
      q: query,
      site_id: "MLB",
      limit: String(Math.min(limit, 50)),
      offset: String(offset),
    });
    if (category) params.set("category", category);

    console.log(`Searching ML: ${query} (limit=${limit}, offset=${offset})`);

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
      currency: item.currency_id,
      thumbnail: item.thumbnail?.replace("http://", "https://").replace("-I.jpg", "-O.jpg") || null,
      permalink: item.permalink,
      condition: item.condition,
      available_quantity: item.available_quantity,
      sold_quantity: item.sold_quantity,
      category_id: item.category_id,
      seller_nickname: item.seller?.nickname || null,
    }));

    console.log(`Found ${results.length} results (total: ${searchData.paging?.total})`);

    return new Response(
      JSON.stringify({
        results,
        total: searchData.paging?.total || 0,
        offset: searchData.paging?.offset || 0,
        limit: searchData.paging?.limit || limit,
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
