import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function getAccessToken(supabase: any): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_access_token")
    .single();

  if (!tokenData?.value) return null;

  // Check if token is expired
  const { data: expiresData } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_token_expires_at")
    .single();

  if (expiresData?.value && new Date(expiresData.value) < new Date()) {
    // Try to refresh
    const refreshed = await refreshToken(supabase);
    return refreshed;
  }

  return tokenData.value;
}

async function refreshToken(supabase: any): Promise<string | null> {
  const mlAppId = Deno.env.get("ML_APP_ID");
  const mlClientSecret = Deno.env.get("ML_CLIENT_SECRET");

  if (!mlAppId || !mlClientSecret) return null;

  const { data: refreshData } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_refresh_token")
    .single();

  if (!refreshData?.value) return null;

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: mlAppId,
      client_secret: mlClientSecret,
      refresh_token: refreshData.value,
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Failed to refresh ML token:", await tokenResponse.text());
    return null;
  }

  const tokenResult = await tokenResponse.json();

  // Store new tokens
  await supabase.from("site_settings").upsert(
    { key: "ml_access_token", value: tokenResult.access_token, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  await supabase.from("site_settings").upsert(
    { key: "ml_refresh_token", value: tokenResult.refresh_token, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  const expiresAt = new Date(Date.now() + tokenResult.expires_in * 1000).toISOString();
  await supabase.from("site_settings").upsert(
    { key: "ml_token_expires_at", value: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  console.log("ML token refreshed successfully");
  return tokenResult.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query, category, priceMin, priceMax, condition, limit = 20, offset = 0, getCategories } = body;

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

    // Get access token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const accessToken = await getAccessToken(supabase);

    // Build search params
    const params = new URLSearchParams({
      q: query,
      site_id: "MLB",
      limit: String(Math.min(limit, 50)),
      offset: String(offset),
    });

    if (category) params.set("category", category);
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
    if (condition === "new") params.set("ITEM_CONDITION", "2230284");
    if (condition === "used") params.set("ITEM_CONDITION", "2230581");

    console.log(`Searching ML: ${query} (token=${accessToken ? "yes" : "no"}, category=${category}, limit=${limit}, offset=${offset})`);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const searchResponse = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`, { headers });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error(`ML search failed: ${searchResponse.status} - ${errText.slice(0, 200)}`);

      // If 403 with token, try refreshing and retry once
      if (searchResponse.status === 403 && accessToken) {
        console.log("Token may be expired, attempting refresh...");
        const newToken = await refreshToken(supabase);
        if (newToken) {
          const retryResponse = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            return buildResponse(retryData, limit);
          }
        }
      }

      throw new Error(`ML API returned ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    return buildResponse(searchData, limit);
  } catch (error) {
    console.error("ML search error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildResponse(searchData: any, limit: number) {
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
}
