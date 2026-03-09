import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScrapeQueueItem {
  sourceId: string;
  name: string;
  source_type: string;
  is_foreign: boolean;
  priority: number; // lower = higher priority
}

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
      .select("id, name, source_type, is_active, is_foreign")
      .eq("is_active", true);

    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active sources to scrape", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auto-scrape: found ${sources.length} active sources`);

    // Build priority queue:
    // 1. National article sources (fastest, most reliable)
    // 2. Product sources
    // 3. International article sources (slowest due to translation)
    const queue: ScrapeQueueItem[] = sources.map((source) => {
      let priority: number;
      if (source.source_type === "article" && !source.is_foreign) {
        priority = 1; // National articles first
      } else if (source.source_type === "product") {
        priority = 2; // Products second
      } else {
        priority = 3; // International articles last (need translation)
      }
      return {
        sourceId: source.id,
        name: source.name,
        source_type: source.source_type,
        is_foreign: source.is_foreign ?? false,
        priority,
      };
    });

    // Sort by priority (ascending = higher priority first)
    queue.sort((a, b) => a.priority - b.priority);

    console.log(`Queue order: ${queue.map((q) => `${q.name} (p${q.priority})`).join(" → ")}`);

    // Save queue start status
    await supabase
      .from("site_settings")
      .upsert(
        {
          key: "auto_scrape_status",
          value: JSON.stringify({
            status: "running",
            started_at: new Date().toISOString(),
            total_sources: queue.length,
            completed: 0,
            queue: queue.map((q) => ({
              name: q.name,
              priority: q.priority,
              status: "pending",
            })),
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    const results: { sourceId: string; name: string; status: string; count?: number; error?: string; priority: number }[] = [];
    let completedCount = 0;

    // Process queue sequentially with delays based on type
    for (const item of queue) {
      try {
        console.log(`[${completedCount + 1}/${queue.length}] Scraping: ${item.name} (priority ${item.priority}, ${item.is_foreign ? "international" : "national"})`);

        const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-news`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sourceId: item.sourceId }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Failed to scrape ${item.name}: ${scrapeResponse.status} - ${errorText}`);
          results.push({
            sourceId: item.sourceId,
            name: item.name,
            status: "error",
            error: `HTTP ${scrapeResponse.status}`,
            priority: item.priority,
          });
        } else {
          const data = await scrapeResponse.json();
          const count = item.source_type === "product" ? data.productsCount : data.articlesCount;

          results.push({
            sourceId: item.sourceId,
            name: item.name,
            status: "success",
            count: count || 0,
            priority: item.priority,
          });

          console.log(`✓ ${item.name}: ${count || 0} items`);
        }

        completedCount++;

        // Update progress
        await supabase
          .from("site_settings")
          .upsert(
            {
              key: "auto_scrape_status",
              value: JSON.stringify({
                status: "running",
                started_at: new Date().toISOString(),
                total_sources: queue.length,
                completed: completedCount,
                current: item.name,
                queue: queue.map((q, idx) => ({
                  name: q.name,
                  priority: q.priority,
                  status: idx < completedCount ? (results[idx]?.status || "done") : idx === completedCount ? "running" : "pending",
                })),
              }),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
          );

        // Delay between sources: longer for international (translation heavy)
        const delay = item.is_foreign ? 5000 : item.source_type === "product" ? 3000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (err) {
        console.error(`Error scraping ${item.name}:`, err);
        results.push({
          sourceId: item.sourceId,
          name: item.name,
          status: "error",
          error: String(err),
          priority: item.priority,
        });
        completedCount++;

        // Continue to next source after error with a short delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Save final status
    const totalItems = results.reduce((sum, r) => sum + (r.count || 0), 0);
    await supabase
      .from("site_settings")
      .upsert(
        {
          key: "auto_scrape_status",
          value: JSON.stringify({
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            total_sources: queue.length,
            completed: completedCount,
            total_items: totalItems,
            queue: queue.map((q, idx) => ({
              name: q.name,
              priority: q.priority,
              status: results[idx]?.status || "unknown",
              count: results[idx]?.count,
            })),
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    // Also save last run timestamp (backward compatible)
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
