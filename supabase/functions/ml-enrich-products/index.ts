import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidMLToken(supabase: any): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const mlAppId = Deno.env.get("ML_APP_ID");
  const mlClientSecret = Deno.env.get("ML_CLIENT_SECRET");

  // Get stored token
  const { data: tokenRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_access_token")
    .maybeSingle();

  const { data: expiresRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_token_expires_at")
    .maybeSingle();

  if (!tokenRow?.value) return null;

  // Check if token is expired (with 5min buffer)
  const expiresAt = expiresRow?.value ? new Date(expiresRow.value) : null;
  const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) return tokenRow.value;

  // Try to refresh token
  if (!mlAppId || !mlClientSecret) return null;

  const { data: refreshRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_refresh_token")
    .maybeSingle();

  if (!refreshRow?.value) return null;

  console.log("Refreshing ML token...");

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: mlAppId,
      client_secret: mlClientSecret,
      refresh_token: refreshRow.value,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("ML token refresh failed:", tokenData);
    return null;
  }

  // Save new tokens
  await supabase.from("site_settings").upsert(
    { key: "ml_access_token", value: tokenData.access_token, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  await supabase.from("site_settings").upsert(
    { key: "ml_refresh_token", value: tokenData.refresh_token, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  await supabase.from("site_settings").upsert(
    { key: "ml_token_expires_at", value: newExpiry, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  console.log("ML token refreshed successfully");
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const mlToken = await getValidMLToken(supabase);
    if (!mlToken) {
      return new Response(
        JSON.stringify({ error: "ML token not available. Please authorize first." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get products from ML that need enrichment (no image or no price)
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, original_url, image_url, price")
      .or("image_url.is.null,price.is.null")
      .ilike("original_url", "%mercadolivre.com.br%")
      .limit(20);

    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: "No ML products need enrichment", enriched: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${products.length} ML products to enrich`);

    let enrichedCount = 0;

    for (const product of products) {
      try {
        // Extract MLB ID from URL
        const mlbMatch = product.original_url.match(/MLB[-_]?(\d+)/i);
        if (!mlbMatch) {
          console.log(`No MLB ID found in: ${product.original_url}`);
          continue;
        }

        const mlbId = `MLB${mlbMatch[1]}`;
        console.log(`Enriching ${mlbId}: ${product.name.slice(0, 50)}`);

        const itemResponse = await fetch(`https://api.mercadolibre.com/items/${mlbId}`, {
          headers: { Authorization: `Bearer ${mlToken}` },
        });

        if (!itemResponse.ok) {
          const errText = await itemResponse.text();
          console.log(`ML API ${itemResponse.status} for ${mlbId}: ${errText.slice(0, 100)}`);
          continue;
        }

        const itemData = await itemResponse.json();

        const updates: Record<string, any> = {};

        // Get best image
        if (!product.image_url && itemData.pictures && itemData.pictures.length > 0) {
          const pic = itemData.pictures[0];
          updates.image_url = (pic.secure_url || pic.url || "").replace("http://", "https://");
          console.log(`  Image: ${updates.image_url.slice(0, 80)}`);
        }
        // Fallback to thumbnail
        if (!product.image_url && !updates.image_url && itemData.thumbnail) {
          updates.image_url = itemData.thumbnail.replace("http://", "https://").replace("-I.jpg", "-O.jpg");
        }

        // Get price
        if (product.price === null && itemData.price) {
          updates.price = itemData.price;
          console.log(`  Price: R$ ${updates.price}`);
        }

        // Get description if missing (separate API call)
        // Skip for now to save API calls

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error: updateError } = await supabase
            .from("products")
            .update(updates)
            .eq("id", product.id);

          if (updateError) {
            console.error(`Failed to update ${product.id}:`, updateError);
          } else {
            enrichedCount++;
            console.log(`  ✓ Updated ${mlbId}`);
          }
        }

        // Respect rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error enriching ${product.id}:`, e);
      }
    }

    console.log(`Enrichment complete: ${enrichedCount}/${products.length} products updated`);

    return new Response(
      JSON.stringify({
        success: true,
        total: products.length,
        enriched: enrichedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ML enrich error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
