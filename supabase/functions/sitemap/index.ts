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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = "https://agregador-global-news.lovable.app";

    // Fetch all articles
    const { data: articles } = await supabase
      .from("articles")
      .select("slug, updated_at, category, published_at")
      .order("published_at", { ascending: false })
      .limit(1000);

    // Fetch all products
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(500);

    const categories = [
      "politica", "economia", "tecnologia", "esportes",
      "entretenimento", "saude", "ciencia", "mundo", "brasil", "cultura",
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/produtos</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/mais-lidas</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

    // Category pages
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${baseUrl}/categoria/${cat}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Article pages
    if (articles) {
      for (const article of articles) {
        const lastmod = article.updated_at || article.published_at || new Date().toISOString();
        xml += `
  <url>
    <loc>${baseUrl}/noticia/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    }

    // Product pages
    if (products) {
      for (const product of products) {
        xml += `
  <url>
    <loc>${baseUrl}/produtos</loc>
    <lastmod>${product.updated_at || new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
