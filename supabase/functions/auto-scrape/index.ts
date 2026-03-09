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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active sources
    const { data: sources, error: sourcesError } = await supabase
      .from("news_sources")
      .select("id, name, source_type, is_active")
      .eq("is_active", true);

    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active sources to scrape", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auto-scrape: found ${sources.length} active sources`);

    const results: { sourceId: string; name: string; status: string; count?: number; error?: string }[] = [];

    // Scrape each source sequentially to avoid rate limits
    for (const source of sources) {
      try {
        console.log(`Scraping: ${source.name} (${source.id})`);

        const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-news`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sourceId: source.id }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Failed to scrape ${source.name}: ${scrapeResponse.status} - ${errorText}`);
          results.push({
            sourceId: source.id,
            name: source.name,
            status: "error",
            error: `HTTP ${scrapeResponse.status}`,
          });
          continue;
        }

        const data = await scrapeResponse.json();
        const count = source.source_type === "product" ? data.productsCount : data.articlesCount;

        results.push({
          sourceId: source.id,
          name: source.name,
          status: "success",
          count: count || 0,
        });

        console.log(`✓ ${source.name}: ${count || 0} items`);

        // Small delay between sources to be respectful
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error scraping ${source.name}:`, err);
        results.push({
          sourceId: source.id,
          name: source.name,
          status: "error",
          error: String(err),
        });
      }
    }

    // Save last run timestamp
    await supabase
      .from("site_settings")
      .upsert(
        {
          key: "auto_scrape_last_run",
          value: JSON.stringify({
            timestamp: new Date().toISOString(),
            sourcesCount: sources.length,
            results: results.map((r) => ({ name: r.name, status: r.status, count: r.count })),
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    const totalItems = results.reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(`Auto-scrape complete: ${totalItems} total items from ${sources.length} sources`);

    return new Response(
      JSON.stringify({
        success: true,
        sourcesProcessed: sources.length,
        totalItems,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-scrape error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
