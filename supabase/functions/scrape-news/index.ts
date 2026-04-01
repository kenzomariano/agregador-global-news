import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_foreign: boolean;
  source_type: "article" | "product";
  sitemap_url: string | null;
}

// Patterns that indicate non-article pages
const NON_ARTICLE_PATTERNS = [
  /\/autor\//i,
  /\/author\//i,
  /\/tag\//i,
  /\/tags\//i,
  /\/categoria\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/page\/\d+/i,
  /\/search\?/i,
  /\/search\//i,
  /\?page=/i,
  /\?sort=/i,
  /\?filter=/i,
  /\?limit=/i,
  /\/about\/?$/i,
  /\/contact\/?$/i,
  /\/privacy\/?$/i,
  /\/terms\/?$/i,
  /\/advertise\/?$/i,
  /\/subscribe\/?$/i,
  /\/login\/?$/i,
  /\/register\/?$/i,
  /\/premium\/?$/i,
  /\/archive\/?$/i,
  /\/archives\/?$/i,
  /\/topics?\/?$/i,
  /\/labels?\/?$/i,
  /\/sections?\/?$/i,
  /\/writers?\/?$/i,
  /\/contributors?\/?$/i,
  /\/#[^/]*$/,
  /\/feed\/?$/i,
  /\/rss\/?$/i,
  /\.xml$/i,
  /\.pdf$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\.gif$/i,
  /\/cart\/?$/i,
  /\/checkout\/?$/i,
  /\/account\/?$/i,
  /\/wishlist\/?$/i,
  /\/compare\/?$/i,
];

// Patterns that indicate article URLs
const ARTICLE_PATTERNS = [
  /\/\d{4}\/\d{2}\/\d{2}\//,
  /\/\d{4}\/\d{2}\//,
  /\/article\//i,
  /\/articles\//i,
  /\/story\//i,
  /\/stories\//i,
  /\/post\//i,
  /\/posts\//i,
  /\/news\//i,
  /\/noticia\//i,
  /\/noticias\//i,
  /\/-[a-z0-9]{6,}$/i,
  /\/[a-z0-9-]+\d{5,}/i,
];

// Patterns that indicate product URLs
const PRODUCT_PATTERNS = [
  /\/product\//i,
  /\/products\//i,
  /\/produto\//i,
  /\/produtos\//i,
  /\/item\//i,
  /\/items\//i,
  /\/shop\//i,
  /\/store\//i,
  /\/loja\//i,
  /\/p\/[a-z0-9]+-[a-z0-9-]+/i, // Product with slug (e.g. /p/product-name)
  /\/dp\/[A-Z0-9]+/i, // Amazon style
  /\?sku=/i,
  /\?product_id=/i,
  /-i\.\d+\.\d+/i, // Shopee product pattern (e.g. -i.676690142.43970146313)
  /\/p\/MLB\d+/i, // Mercado Livre product pattern (e.g. /p/MLB47115842)
];

const DEFAULT_SCRAPE_LIMIT = 5;
const MAX_ARTICLES_PER_SCRAPE = 10;
const MAX_PRODUCTS_PER_SCRAPE = 10;

const GENERIC_IMAGE_PATTERNS = [
  /logo/i,
  /icon/i,
  /sprite/i,
  /favicon/i,
  /placeholder/i,
  /default[-_]?image/i,
  /no[-_]?image/i,
  /image[-_]?not[-_]?found/i,
  /sem[-_]?imagem/i,
  /frontend-assets/i,
  /blank/i,
  /pixel/i,
  /1x1/i,
  /vlibras/i,
  /access_popup/i,
  /\/assets\/[a-f0-9]{16,}\./i, // Generic hashed asset files
  /41Dhma07YkL/i, // Amazon generic placeholder
  /prime[-_]?logo/i, // Amazon Prime logo/banner
  /prime[-_]?banner/i,
  /banner/i, // Generic banners
  /promo[-_]?banner/i,
  /hero[-_]?image/i,
  /carousel/i, // Carousel/slider banners
  /slider/i,
  /badge/i,
  /stamp/i,
  /overlay/i,
  /watermark/i,
  /ad[-_]?image/i,
  /advertisement/i,
  /campaign/i,
  /landing[-_]?page/i,
  /gateway[-_]?image/i,
  /prime-storefront/i, // Amazon Prime storefront assets
  /TopBanner/i,
  /bottom[-_]?sheet/i,
  /GW\/\d+x\d+/i, // Amazon gateway images (e.g., GW/1500x600)
];

function normalizeImageUrl(url: string): string {
  return url
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/")
    .trim();
}

// Upscale Amazon image URLs from tiny thumbnails to large product images
function upscaleAmazonImage(url: string): string {
  if (!url || !/m\.media-amazon\.com/i.test(url)) return url;
  // Replace any Amazon image size suffix with large version (500px)
  // Common patterns: _AC_US40_, _SX38_, _AC_UL320_, _SS100_, etc.
  return url
    .replace(/_AC_US\d+_/g, "_AC_SL500_")
    .replace(/_SX\d+_/g, "_SL500_")
    .replace(/_SY\d+_/g, "_SL500_")
    .replace(/_SS\d+_/g, "_SL500_")
    .replace(/_AC_UL\d+_/g, "_AC_SL500_")
    .replace(/_AC_SR\d+,\d+_/g, "_AC_SL500_")
    .replace(/_AC_SX\d+_/g, "_AC_SL500_");
}

function extractCanonicalProductUrl(url: string): string {
  const normalized = normalizeImageUrl(url);

  try {
    const parsed = new URL(normalized);

    if (/google\./i.test(parsed.hostname)) {
      const redirectedUrl = parsed.searchParams.get("url") || parsed.searchParams.get("q");
      if (redirectedUrl && /^https?:\/\//i.test(redirectedUrl)) {
        return normalizeImageUrl(redirectedUrl).split("#")[0].split("?")[0];
      }
    }
  } catch {
    // ignore invalid URL and keep fallback below
  }

  return normalized.split("#")[0].split("?")[0];
}

function isGoogleShoppingThumbnail(url: string): boolean {
  return /https?:\/\/encrypted-tbn\d*\.gstatic\.com\/shopping\?q=tbn:/i.test(url);
}

function isGenericImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  if (/gstatic\.com\/images\?q=tbn:/i.test(lowerUrl)) {
    return true;
  }

  if (/deo\.shopeemobile\.com\/shopee\/shopee-pcmall-live-[^/]+\/assets\//i.test(lowerUrl)) {
    return true;
  }

  // Reject constructed MLB image URLs that are invalid
  if (/mlstatic\.com\/D_NQ_NP_2X_MLB\d+-F\./i.test(lowerUrl)) {
    return true;
  }

  // Reject Amazon non-product images (storefront, editorial, gateway)
  if (/m\.media-amazon\.com\/images\/(G|S|W)\//i.test(lowerUrl)) {
    return true; // G=gateway/banners, S=store assets, W=widgets
  }

  // Reject very wide aspect ratio images (likely banners) based on URL dimensions
  const dimMatch = lowerUrl.match(/(\d{3,4})x(\d{2,4})/);
  if (dimMatch) {
    const w = parseInt(dimMatch[1]);
    const h = parseInt(dimMatch[2]);
    if (w > 0 && h > 0 && w / h > 3) return true; // e.g. 1500x300 banner
  }

  return GENERIC_IMAGE_PATTERNS.some((pattern) => pattern.test(lowerUrl));
}

function isLikelyProductImage(url: string): boolean {
  const normalized = normalizeImageUrl(url);
  if (!normalized || !/^https?:\/\//i.test(normalized)) return false;
  if (isGenericImageUrl(normalized)) return false;

  if (isGoogleShoppingThumbnail(normalized)) return true;

  return (
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(normalized) ||
    /mlstatic\.com\//i.test(normalized) ||
    /susercontent\.com\//i.test(normalized) ||
    /shopee\.(?:com|com\.br)\//i.test(normalized)
  );
}

function pickBestProductImage(candidates: string[]): string | null {
  const validCandidates = [...new Set(candidates.map(normalizeImageUrl).filter((candidate) => isLikelyProductImage(candidate)))];

  if (validCandidates.length === 0) return null;

  // Score each candidate: higher = better
  function scoreImage(url: string): number {
    let score = 0;
    if (isGoogleShoppingThumbnail(url)) score += 100;
    if (/m\.media-amazon\.com\/images\/I\//i.test(url)) score += 90; // Amazon product images folder
    if (/mlstatic\.com\//i.test(url)) score += 80;
    if (/susercontent\.com\//i.test(url)) score += 70;
    // Prefer larger images (SL500, SL1500 etc.)
    const slMatch = url.match(/_SL(\d+)/);
    if (slMatch) score += Math.min(parseInt(slMatch[1]) / 10, 50);
    // Penalize very small images
    if (/_S[XY]\d{1,2}_/i.test(url)) score -= 30;
    if (/_AC_US\d{1,2}_/i.test(url)) score -= 30;
    return score;
  }

  validCandidates.sort((a, b) => scoreImage(b) - scoreImage(a));
  return validCandidates[0];
}

function isLikelyArticleUrl(url: string, baseUrl: string): boolean {
  if (!url.startsWith(baseUrl)) return false;
  
  const path = url.replace(baseUrl, "").replace(/^\/+/, "");
  if (!path || path === "/" || path.length < 5) return false;
  
  for (const pattern of NON_ARTICLE_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  
  for (const pattern of ARTICLE_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 1) {
    const lastSegment = segments[segments.length - 1];
    const dashCount = (lastSegment.match(/-/g) || []).length;
    if (dashCount >= 2 && lastSegment.length > 20) return true;
  }
  
  return false;
}

function isLikelyProductUrl(url: string, baseUrl: string): boolean {
  if (!url.startsWith(baseUrl)) return false;
  
  const path = url.replace(baseUrl, "").replace(/^\/+/, "");
  if (!path || path === "/" || path.length < 3) return false;
  
  // Skip known non-product paths
  const skipPaths = [/\/glossary\//i, /\/search/i, /\/categorias?\//i, /\/help\//i, /\/login/i, /\/register/i, /\/cart/i, /\/checkout/i];
  for (const sp of skipPaths) {
    if (sp.test(url)) return false;
  }
  
  for (const pattern of NON_ARTICLE_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  
  for (const pattern of PRODUCT_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  
  return false;
}

function isValidArticleTitle(title: string, sourceName: string): boolean {
  if (!title || title.length < 15) return false;
  if (title.length > 300) return false;
  
  const lowerTitle = title.toLowerCase();
  const lowerSourceName = sourceName.toLowerCase();
  
  if (lowerTitle === lowerSourceName) return false;
  if (lowerTitle.replace(/[^a-z0-9]/g, "") === lowerSourceName.replace(/[^a-z0-9]/g, "")) return false;
  
  const genericTitles = [
    "home", "homepage", "index", "main", "news", "latest", "trending",
    "popular", "featured", "top stories", "breaking news", "all news",
    "category", "categories", "archive", "archives", "search", "results",
    "author", "authors", "about", "contact", "privacy", "terms",
    "shop", "store", "cart", "checkout", "products", "all products",
  ];
  
  for (const generic of genericTitles) {
    if (lowerTitle === generic || lowerTitle.startsWith(generic + " -") || lowerTitle.endsWith("- " + generic)) {
      return false;
    }
  }
  
  const wordCount = title.split(/\s+/).length;
  if (wordCount < 3) return false;
  
  return true;
}

function extractVideoUrl(content: string): string | null {
  const youtubePatterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of youtubePatterns) {
    const match = content.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  const vimeoPatterns = [
    /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    /https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of vimeoPatterns) {
    const match = content.match(pattern);
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }
  
  const twitterPattern = /https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
  const twitterMatch = content.match(twitterPattern);
  if (twitterMatch) {
    return `https://platform.twitter.com/embed/Tweet.html?id=${twitterMatch[1]}`;
  }
  
  return null;
}

// Parse sitemap XML and extract URLs with dates
async function parseSitemap(sitemapUrl: string): Promise<{ url: string; lastmod?: string }[]> {
  try {
    console.log(`Fetching sitemap: ${sitemapUrl}`);
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      console.error(`Failed to fetch sitemap: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const urls: { url: string; lastmod?: string }[] = [];
    
    // Check if this is a sitemap index
    if (xmlText.includes("<sitemapindex")) {
      const sitemapMatches = xmlText.matchAll(/<sitemap[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi);
      const childSitemaps: string[] = [];
      
      for (const match of sitemapMatches) {
        childSitemaps.push(match[1].trim());
      }
      
      // Parse child sitemaps (limit to first 2 to avoid timeout)
      for (const childUrl of childSitemaps.slice(0, 2)) {
        const childUrls = await parseSitemap(childUrl);
        urls.push(...childUrls);
      }
    } else {
      // Parse regular sitemap
      const urlMatches = xmlText.matchAll(/<url[^>]*>([\s\S]*?)<\/url>/gi);
      
      for (const match of urlMatches) {
        const urlBlock = match[1];
        const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/);
        const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/);
        
        if (locMatch) {
          urls.push({
            url: locMatch[1].trim(),
            lastmod: lastmodMatch ? lastmodMatch[1].trim() : undefined,
          });
        }
      }
    }
    
    console.log(`Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error) {
    console.error("Error parsing sitemap:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sourceId, sitemapContent } = await req.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: "sourceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the source
    const { data: source, error: sourceError } = await supabase
      .from("news_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ error: "Source not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedSource = source as NewsSource & { scrape_limit?: number | null };
    const isProductSource = typedSource.source_type === "product";
    const hardMaxItems = isProductSource ? MAX_PRODUCTS_PER_SCRAPE : MAX_ARTICLES_PER_SCRAPE;
    const configuredLimit = typedSource.scrape_limit ?? DEFAULT_SCRAPE_LIMIT;
    const maxItems = Math.min(hardMaxItems, Math.max(1, configuredLimit));

    console.log(`Scraping ${typedSource.name} (${typedSource.source_type}) from ${typedSource.url}`);

    let itemLinks: string[] = [];
    const baseUrl = typedSource.url.replace(/\/+$/, "");

    // Check if we have a sitemap to use
    if (typedSource.sitemap_url || sitemapContent) {
      let sitemapUrls: { url: string; lastmod?: string }[] = [];
      
      if (sitemapContent) {
        // Parse sitemap from uploaded content
        const urlMatches = sitemapContent.matchAll(/<url[^>]*>([\s\S]*?)<\/url>/gi);
        for (const match of urlMatches) {
          const urlBlock = match[1];
          const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/);
          const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/);
          if (locMatch) {
            sitemapUrls.push({
              url: locMatch[1].trim(),
              lastmod: lastmodMatch ? lastmodMatch[1].trim() : undefined,
            });
          }
        }
      } else if (typedSource.sitemap_url) {
        sitemapUrls = await parseSitemap(typedSource.sitemap_url);
      }

      // Sort by lastmod (most recent first)
      sitemapUrls.sort((a, b) => {
        if (!a.lastmod && !b.lastmod) return 0;
        if (!a.lastmod) return 1;
        if (!b.lastmod) return -1;
        return new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime();
      });

      // Filter URLs based on source type
      if (isProductSource) {
        itemLinks = sitemapUrls
          .map(u => u.url)
          .filter(url => isLikelyProductUrl(url, baseUrl) || !NON_ARTICLE_PATTERNS.some(p => p.test(url)))
          .slice(0, maxItems);
      } else {
        itemLinks = sitemapUrls
          .map(u => u.url)
          .filter(url => isLikelyArticleUrl(url, baseUrl))
          .slice(0, maxItems);
      }

      console.log(`Using ${itemLinks.length} URLs from sitemap`);
    }

    // Store search result metadata for products (title, description, image, etc.)
    const searchResultsMap: Record<string, { title?: string; description?: string; markdown?: string; image?: string }> = {};

    if (itemLinks.length < maxItems) {
      if (isProductSource) {
        // Build product search queries targeting Mercado Livre & Shopee via Google Shopping
        const PRODUCT_QUERY_MAP: Record<string, string[]> = {
          "Eletrônicos": [
            "site:produto.mercadolivre.com.br smartphone samsung",
            "site:produto.mercadolivre.com.br notebook lenovo",
            "site:produto.mercadolivre.com.br fone bluetooth",
            "site:produto.mercadolivre.com.br smart tv 4k",
          ],
          "Vestuário": [
            "site:produto.mercadolivre.com.br tênis nike masculino",
            "site:produto.mercadolivre.com.br mochila escolar",
            "site:produto.mercadolivre.com.br camiseta adidas",
            "site:produto.mercadolivre.com.br tênis feminino",
          ],
          "Casa e Jardim": [
            "site:produto.mercadolivre.com.br aspirador robô",
            "site:produto.mercadolivre.com.br cafeteira nespresso",
            "site:produto.mercadolivre.com.br fritadeira airfryer",
            "site:produto.mercadolivre.com.br panela elétrica",
          ],
          "Google Shopping": [
            "site:produto.mercadolivre.com.br oferta",
            "site:produto.mercadolivre.com.br promoção",
          ],
        };

        const categoryName = typedSource.name;
        const specificQueries = PRODUCT_QUERY_MAP[categoryName] || [
          `site:produto.mercadolivre.com.br ${categoryName}`,
          `site:produto.mercadolivre.com.br ${categoryName} oferta`,
        ];
        
        const searchQueries = specificQueries.slice(0, Math.min(4, specificQueries.length));

        console.log(`Using Firecrawl Search API for products: ${searchQueries.join(" | ")}`);

        const allFoundLinks: string[] = [];
        
        // Known e-commerce domains
        const ECOMMERCE_DOMAINS = [
          "mercadolivre.com.br",
          "shopee.com.br",
          "amazon.com.br",
          "magazineluiza.com.br",
          "kabum.com.br",
          "americanas.com.br",
          "casasbahia.com.br",
          "pontofrio.com.br",
          "extra.com.br",
        ];

        for (const query of searchQueries) {
          if (allFoundLinks.length >= maxItems * 3) break;
          try {
            const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query,
                limit: 10,
                lang: "pt-br",
                country: "br",
                scrapeOptions: {
                  formats: ["markdown"],
                },
              }),
            });

            const searchData = await searchResponse.json();
            if (searchResponse.ok && searchData.data) {
              console.log(`Search returned ${searchData.data.length} results for "${query}"`);
              
              for (const result of searchData.data) {
                const resultUrl = result.url || "";
                const cleanUrl = extractCanonicalProductUrl(resultUrl);
                
                // Check if URL is actually a PRODUCT page (not listing/category/search)
                const isEcommerce = ECOMMERCE_DOMAINS.some(d => cleanUrl.includes(d));
                
                // Positive product URL patterns - must match at least one
                const PRODUCT_URL_PATTERNS = [
                  /mercadolivre\.com\.br\/.*-_JM/i,          // ML product (old format)
                  /mercadolivre\.com\.br\/.*\/p\/MLB/i,      // ML product (new format)
                  /mercadolivre\.com\.br\/MLB-/i,            // ML product direct
                  /produto\.mercadolivre\.com\.br\//i,       // ML product subdomain
                  /mercadolivre\.com\.br\/.*MLB\d+/i,        // ML product ID in URL
                  /mercadolivre\.com\.br\/.*-\d{6,}/i,       // ML product with numeric ID
                  /shopee\.com\.br\/.*-i\.\d+\.\d+/i,       // Shopee product
                  /shopee\.com\.br\/product\//i,             // Shopee product alt
                  /amazon\.com\.br\/.*\/dp\//i,              // Amazon product
                  /amazon\.com\.br\/dp\//i,                  // Amazon short product
                  /magazineluiza\.com\.br\/.*\/p\//i,        // Magalu product
                  /kabum\.com\.br\/produto\//i,              // Kabum product
                  /americanas\.com\.br\/produto\//i,         // Americanas product
                  /casasbahia\.com\.br\/produto\//i,         // Casas Bahia product
                ];
                
                const isProductUrl = isEcommerce && PRODUCT_URL_PATTERNS.some(p => p.test(cleanUrl));
                
                if (isProductUrl) {
                  allFoundLinks.push(cleanUrl);
                  
                  const metadata = result.metadata || {};
                  const markdown = result.markdown || "";
                  const description = result.description || metadata.description || metadata.ogDescription || "";
                  
                  // Extract image from search result metadata
                  const imageCandidates: string[] = [];
                  if (metadata.ogImage) imageCandidates.push(metadata.ogImage);
                  if (metadata.image) imageCandidates.push(metadata.image);
                  if (result.image) imageCandidates.push(result.image);
                  
                  const bestImage = pickBestProductImage(
                    imageCandidates.filter((c): c is string => typeof c === "string" && c.length > 0)
                  );
                  
                  searchResultsMap[cleanUrl] = {
                    title: result.title || metadata.title || metadata.ogTitle || "",
                    description,
                    markdown: markdown || description,
                    image: bestImage || "",
                  };
                  
                  console.log(`Product found: ${cleanUrl.slice(0, 80)} | img: ${bestImage ? "YES" : "NO"} | title: ${(result.title || "").slice(0, 60)}`);
                } else {
                  console.log(`Skipped: ${cleanUrl.slice(0, 80)} (ecommerce=${isEcommerce}, productPattern=${isProductUrl})`);
                }
              }
            } else {
              console.error("Firecrawl search error:", JSON.stringify(searchData).slice(0, 200));
            }
          } catch (e) {
            console.error(`Search failed for "${query}":`, e);
          }
        }

        const uniqueSearchLinks = [...new Set(allFoundLinks)];
        itemLinks = [...new Set([...itemLinks, ...uniqueSearchLinks])].slice(0, maxItems);
        console.log(`Found ${uniqueSearchLinks.length} product links from search`);
      }

      // Fallback for articles: scrape homepage for links
      if (!isProductSource && itemLinks.length < maxItems) {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: typedSource.url,
            formats: ["links"],
            onlyMainContent: false,
          }),
        });

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok) {
          console.error("Firecrawl error:", scrapeData);
          if (itemLinks.length === 0) {
            return new Response(
              JSON.stringify({ error: "Failed to scrape website" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const links = scrapeData.data?.links || [];
          const articleLinks = links.filter((link: string) => isLikelyArticleUrl(link, baseUrl));
          itemLinks = [...new Set([...itemLinks, ...articleLinks])].slice(0, maxItems);
        }
      }
    }

    console.log(`Found ${itemLinks.length} ${isProductSource ? "product" : "article"} links to process`);

    let processedCount = 0;
    let skippedCount = 0;
    const categories = ["politica", "economia", "tecnologia", "esportes", "entretenimento", "saude", "ciencia", "mundo", "brasil", "cultura"];

    for (const itemUrl of itemLinks) {
      try {
        if (isProductSource) {
          // Clean tracking params and redirects from URL
          const cleanProductUrl = extractCanonicalProductUrl(itemUrl) || itemUrl;
          
          // Process as product - check by clean URL
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("original_url", cleanProductUrl)
            .maybeSingle();

          const existingId = existing?.id;
          const cleanUrl = cleanProductUrl;
          console.log(`Processing product: ${cleanUrl}`);

          // Get search result data if available
          const searchResult = searchResultsMap[cleanUrl] || {};
          const searchTitle = searchResult.title || "";
          const searchDescription = searchResult.description || "";
          const searchMarkdown = searchResult.markdown || "";
          
          // Combine all text sources for extraction
          const allText = `${searchTitle}\n${searchDescription}\n${searchMarkdown}`;

          // --- NAME EXTRACTION ---
          let name = searchTitle.split(" - ")[0].split(" | ")[0].trim();
          
          // Fallback: extract from URL
          if (!name || name.length < 3) {
            const urlPath = cleanUrl.replace(/.*\.com\.br\//, "").split("/p/")[0].split("-i.")[0];
            name = decodeURIComponent(urlPath)
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
              .trim();
            console.log(`Extracted name from URL: ${name}`);
          }

          // Reject generic store names and non-physical products (eBooks, books, digital)
          const GENERIC_NAMES = ["shopee brasil", "mercado livre", "shopee", "mercadolivre", "please enable javascript"];
          const EBOOK_PATTERNS = [/\bebook\b/i, /\be-book\b/i, /\bkindle edition\b/i, /\bpaperback\b/i, /\bhardcover\b/i, /\bmade easy\b/i, /\bguide to\b/i, /\bhow to\b/i, /\bstep.by.step\b/i, /\blivro\b/i, /\beBooks em/i];
          const isEbook = EBOOK_PATTERNS.some(p => p.test(name) || p.test(searchDescription) || p.test(searchTitle));
          if (!name || name.length < 3 || GENERIC_NAMES.some(g => name.toLowerCase().includes(g)) || isEbook) {
            console.log(`Skipping product: "${name}" (generic=${GENERIC_NAMES.some(g => name.toLowerCase().includes(g))}, ebook=${isEbook}) from ${itemUrl}`);
            skippedCount++;
            continue;
          }

          // --- PRICE EXTRACTION ---
          let price: number | null = null;
          let currency = "BRL";

          // Extract price from search snippets and content using BRL patterns
          const pricePatterns = [
            /R\$\s*([\d.]+,\d{2})/g,           // R$ 1.299,00 or R$ 49,90
            /(\d{1,3}(?:\.\d{3})*,\d{2})/g,     // 1.299,00
          ];

          for (const pattern of pricePatterns) {
            const matches = [...allText.matchAll(pattern)];
            if (matches.length > 0) {
              // Take the first price found (usually the main/sale price)
              const priceStr = matches[0][1]
                .replace(/\./g, "")  // Remove thousand separators
                .replace(",", ".");   // Convert decimal separator
              const parsed = parseFloat(priceStr);
              if (parsed > 0 && parsed < 1000000) {
                price = parsed;
                console.log(`Extracted price R$ ${parsed} from text`);
                break;
              }
            }
          }

          // --- IMAGE EXTRACTION ---
          let imageUrl: string | null = null;

          // Priority 1: direct image extracted from Google Shopping/search metadata
          if (searchResult.image) {
            imageUrl = pickBestProductImage([searchResult.image]);
            if (imageUrl) {
              imageUrl = upscaleAmazonImage(imageUrl);
              console.log(`Using search result image: ${imageUrl.slice(0, 100)}`);
            }
          }

          // Priority 2: collect additional image candidates from combined text
          if (!imageUrl) {
            const gstaticShoppingMatches = allText.match(/https?:\/\/encrypted-tbn\d*\.gstatic\.com\/shopping\?q=tbn:[^\s)"'\\]+/gi) || [];
            const mlImageMatches = [...allText.matchAll(/(https?:\/\/(?:http2\.)?mlstatic\.com\/[^\s)"'\\]+(?:jpg|jpeg|png|webp)[^\s)"'\\]*)/gi)].map((m) => m[1]);
            const shopeeImageMatches = [
              ...allText.matchAll(/(https?:\/\/(?:down-br|cf)\.shopee[^\s)"'\\]+\.(?:jpg|jpeg|png|webp)[^\s)"'\\]*)/gi),
              ...allText.matchAll(/(https?:\/\/[^\s)"'\\]*susercontent\.com[^\s)"'\\]*)/gi),
            ].map((m) => m[1]);
            const markdownImageMatches = [...allText.matchAll(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/gi)].map((m) => m[1]);
            // Also extract Amazon high-res images from markdown
            const amazonImageMatches = [...allText.matchAll(/(https?:\/\/m\.media-amazon\.com\/images\/I\/[^\s)"'\\]+\.(?:jpg|jpeg|png|webp)[^\s)"'\\]*)/gi)].map((m) => m[1]);

            const fallbackImage = pickBestProductImage([
              ...gstaticShoppingMatches,
              ...amazonImageMatches,
              ...mlImageMatches,
              ...shopeeImageMatches,
              ...markdownImageMatches,
            ]);

            if (fallbackImage) {
              imageUrl = upscaleAmazonImage(fallbackImage);
              console.log(`Using fallback image candidate: ${imageUrl.slice(0, 100)}`);
            }
          }

          // Priority 2.5: Scrape product page directly for better image/data extraction
          if (!imageUrl || !price) {
            const shouldScrape = /mercadolivre\.com\.br|shopee\.com\.br|amazon\.com\.br/i.test(cleanUrl);
            if (shouldScrape) {
              try {
                console.log(`Scraping product page for image/data: ${cleanUrl.slice(0, 80)}`);
                const pageScrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${firecrawlKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: cleanUrl,
                    formats: ["markdown"],
                    onlyMainContent: false,
                    waitFor: 3000,
                  }),
                });
                if (pageScrapeResp.ok) {
                  const pageData = await pageScrapeResp.json();
                  const pageMarkdown = pageData.data?.markdown || "";
                  const pageMeta = pageData.data?.metadata || {};
                  const pageImgCandidates: string[] = [];
                  
                  // ogImage from metadata
                  if (pageMeta.ogImage) pageImgCandidates.push(pageMeta.ogImage);
                  
                  // Extract images from page markdown
                  const pageImages = [...pageMarkdown.matchAll(/(https?:\/\/[^\s)"'\\]+\.(?:jpg|jpeg|png|webp)[^\s)"'\\]*)/gi)].map((m: RegExpMatchArray) => m[1]);
                  pageImgCandidates.push(...pageImages);
                  
                  // Also extract markdown images
                  const mdImages = [...pageMarkdown.matchAll(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/gi)].map((m: RegExpMatchArray) => m[1]);
                  pageImgCandidates.push(...mdImages);

                  if (!imageUrl) {
                    const bestPageImg = pickBestProductImage(pageImgCandidates);
                    if (bestPageImg) {
                      imageUrl = /amazon\.com\.br/i.test(cleanUrl) ? upscaleAmazonImage(bestPageImg) : bestPageImg;
                      console.log(`Got page scrape image: ${imageUrl.slice(0, 100)}`);
                    }
                  }
                  
                  // Extract price from page if not found yet
                  if (!price && pageMarkdown) {
                    const pagePriceMatch = pageMarkdown.match(/R\$\s*([\d.]+,\d{2})/);
                    if (pagePriceMatch) {
                      const parsed = parseFloat(pagePriceMatch[1].replace(/\./g, "").replace(",", "."));
                      if (parsed > 0 && parsed < 1000000) {
                        price = parsed;
                        console.log(`Extracted price from page: R$ ${price}`);
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`Product page scrape failed: ${e}`);
              }
            }
          }
          // Priority 3: For ML products, try Items API (works for MLB-XXXXX URLs)
          if (!imageUrl) {
            // Extract MLB item ID from various URL formats
            const mlbItemMatch = cleanUrl.match(/MLB[-_]?(\d+)/i);
            if (mlbItemMatch) {
              const mlbId = `MLB${mlbItemMatch[1]}`;
              try {
                // Items API is public and returns pictures
                const mlItemUrl = `https://api.mercadolibre.com/items/${mlbId}`;
                console.log(`Fetching ML Items API: ${mlItemUrl}`);
                const mlItemResp = await fetch(mlItemUrl);
                if (mlItemResp.ok) {
                  const mlItemData = await mlItemResp.json();
                  const mlPictures = mlItemData.pictures || [];
                  if (mlPictures.length > 0) {
                    const mlPicUrl = (mlPictures[0].secure_url || mlPictures[0].url || "").replace("http://", "https://");
                    if (mlPicUrl) {
                      imageUrl = mlPicUrl;
                      console.log(`Got ML Items API image: ${imageUrl.slice(0, 100)}`);
                    }
                  }
                  // Also extract price from API if not found
                  if (!price && mlItemData.price) {
                    price = mlItemData.price;
                    console.log(`Got ML Items API price: R$ ${price}`);
                  }
                  // Extract thumbnail as last resort
                  if (!imageUrl && mlItemData.thumbnail) {
                    imageUrl = mlItemData.thumbnail.replace("http://", "https://").replace("-I.jpg", "-O.jpg");
                    console.log(`Got ML thumbnail: ${imageUrl.slice(0, 100)}`);
                  }
                } else {
                  console.log(`ML Items API returned ${mlItemResp.status}`);
                }
              } catch (e) {
                console.log(`ML Items API failed: ${e}`);
              }
            }
            
            // Also try catalog API for /p/MLB URLs
            const mlbCatalogMatch = cleanUrl.match(/\/p\/(MLB\d+)/i);
            if (!imageUrl && mlbCatalogMatch) {
              try {
                const mlCatalogUrl = `https://api.mercadolibre.com/products/${mlbCatalogMatch[1]}`;
                console.log(`Fetching ML catalog API: ${mlCatalogUrl}`);
                const mlCatalogResp = await fetch(mlCatalogUrl);
                if (mlCatalogResp.ok) {
                  const mlCatalogData = await mlCatalogResp.json();
                  const mlPictures = mlCatalogData.pictures || [];
                  if (mlPictures.length > 0) {
                    const mlPicUrl = mlPictures[0].url?.replace("http://", "https://");
                    if (mlPicUrl && isLikelyProductImage(mlPicUrl)) {
                      imageUrl = mlPicUrl;
                      console.log(`Got ML catalog image: ${imageUrl.slice(0, 100)}`);
                    }
                  }
                } else {
                  console.log(`ML catalog API returned ${mlCatalogResp.status}`);
                }
              } catch (e) {
                console.log(`ML catalog API failed: ${e}`);
              }
            }
          }

          // No individual page scraping - all data comes from Search API results

          // --- DESCRIPTION & CATEGORY ---
          let description = searchDescription || "";
          let category = "";

          // Use AI for better extraction if available
          if (lovableApiKey && allText.length > 50) {
            const extractPrompt = `Extraia as informações do produto abaixo e retorne APENAS JSON:
{
  "name": "nome do produto limpo e completo",
  "description": "descrição curta do produto (max 200 chars)",
  "price": 0.00,
  "category": "categoria curta do produto (max 2-3 palavras, ex: Smartphones, Tênis, Aspiradores)"
}

REGRAS:
- Para price: extraia o preço numérico em reais. Procure padrões como "R$ 49,90" ou "1.299,00". Se houver preço "de" e "por", use o menor (preço atual). Se não encontrar, use null.
- NÃO invente dados.

URL do produto: ${cleanUrl}

Conteúdo:
${allText.slice(0, 4000)}`;

            try {
              const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [{ role: "user", content: extractPrompt }],
                }),
              });

              if (extractResponse.ok) {
                const extractData = await extractResponse.json();
                const extractContent = extractData.choices?.[0]?.message?.content || "";
                const jsonMatch = extractContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.name && parsed.name.length > 5) name = parsed.name;
                  if (parsed.description) description = parsed.description;
                  if (parsed.price !== null && parsed.price !== undefined && parsed.price > 0 && !price) {
                    price = parsed.price;
                    console.log(`AI extracted price: R$ ${price}`);
                  }
                  if (parsed.category) category = parsed.category;
                }
              }
            } catch (e) {
              console.log("AI extraction failed, using regex data");
            }
          }

          // --- CATEGORY CLEANUP ---
          // If category contains breadcrumb separators (>), take the most specific (last) segment
          if (category && category.includes(">")) {
            const segments = category.split(">").map((s: string) => s.trim()).filter(Boolean);
            // Pick the shortest segment that's >= 3 chars, or last segment
            const shortSegment = segments.filter((s: string) => s.length >= 3 && s.length <= 30)
              .sort((a: string, b: string) => a.length - b.length)[0];
            category = shortSegment || segments[segments.length - 1] || category;
            console.log(`Cleaned category to: "${category}"`);
          }
          // Truncate overly long categories
          if (category && category.length > 30) {
            category = category.slice(0, 30).replace(/\s+\S*$/, "");
          }

          // Final image validation
          if (imageUrl && !isLikelyProductImage(imageUrl)) {
            console.log(`Rejected non-product image: ${imageUrl.slice(0, 80)}`);
            imageUrl = null;
          }

          if (!imageUrl) {
            console.log(`Product without image, using placeholder: ${cleanUrl}`);
            imageUrl = null; // Will be stored as null, frontend shows placeholder
          }

          console.log(`Product result: name="${name}", price=${price}, image=${imageUrl ? "yes" : "no"}, category="${category}"`);

          const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 80) + "-" + Date.now().toString(36);

          if (existingId) {
            const { error: updateError } = await supabase
              .from("products")
              .update({
                name,
                description: description?.slice(0, 500),
                price,
                currency,
                image_url: imageUrl,
                category,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingId);

            if (updateError) {
              console.error(`Failed to update product: ${updateError.message}`);
              continue;
            }

            processedCount++;
            console.log(`Updated product: ${name}`);
          } else {
            const { error: insertError } = await supabase.from("products").insert({
              source_id: typedSource.id,
              name,
              slug,
              description: description?.slice(0, 500),
              price,
              currency,
              image_url: imageUrl,
              original_url: cleanProductUrl,
              category,
            });

            if (insertError) {
              console.error(`Failed to insert product: ${insertError.message}`);
              continue;
            }

            processedCount++;
            console.log(`Inserted product: ${name}`);
          }
        } else {
          // Process as article (existing logic)
          const { data: existing } = await supabase
            .from("articles")
            .select("id, title")
            .eq("original_url", itemUrl)
            .maybeSingle();

          const existingId = existing?.id;

          const articleResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: itemUrl,
              formats: ["markdown", "html"],
              onlyMainContent: true,
              waitFor: 2000,
            }),
          });

          const articleData = await articleResponse.json();

          if (!articleResponse.ok) {
            console.error(`Failed to scrape article: ${itemUrl}`);
            continue;
          }

          let title = articleData.data?.metadata?.title || "";
          let rawContent = articleData.data?.markdown || "";
          const rawHtml = articleData.data?.html || "";
          let excerpt = articleData.data?.metadata?.description || "";
          let imageUrl = articleData.data?.metadata?.ogImage || articleData.data?.metadata?.image || null;

          title = title.split(" - ")[0].split(" | ")[0].trim();

          if (!isValidArticleTitle(title, typedSource.name)) {
            console.log(`Skipping non-article page: ${title} (${itemUrl})`);
            skippedCount++;
            continue;
          }

          const videoUrl = extractVideoUrl(rawContent + rawHtml);

          let content = "";

          if (lovableApiKey && rawContent) {
            console.log(`Processing article: ${title}`);

            const linkCount = (rawContent.match(/\[.*?\]\(.*?\)/g) || []).length;
            const textLength = rawContent.replace(/\[.*?\]\(.*?\)/g, "").replace(/\s+/g, " ").length;
            const linkRatio = linkCount / (textLength / 100);
            
            if (linkRatio > 2 && textLength < 1500) {
              console.log(`Skipping link-heavy page: ${title} (${linkCount} links, ${textLength} chars)`);
              skippedCount++;
              continue;
            }
            
            if (textLength < 500) {
              console.log(`Skipping short content page: ${title} (${textLength} chars)`);
              skippedCount++;
              continue;
            }

            // Always translate to PT-BR for foreign sources, clean content for all
            const mustTranslate = typedSource.is_foreign;
            const cleanPrompt = `Você é um editor de notícias profissional brasileiro.

TAREFA: Extraia APENAS o corpo principal do artigo e ${mustTranslate ? "TRADUZA COMPLETAMENTE para Português do Brasil. NENHUMA frase deve permanecer em inglês ou outro idioma estrangeiro." : "mantenha em Português"}.

REMOVA COMPLETAMENTE (NÃO INCLUA NO RESULTADO):
- Anúncios, banners, links de "Remove Ads", promoções
- Elementos de reCAPTCHA, captchas, popups
- Controles de player de vídeo e texto de legendas de player
- Menus de navegação, breadcrumbs, sidebar
- Rodapés e cabeçalhos do site
- Links de compartilhamento social e botões de redes sociais
- Seções de comentários e formulários
- Conteúdo relacionado/sugerido, "Leia também", "Related Stories"
- Texto repetido, duplicado ou spam
- Links de navegação interna e paginação
- Avisos de cookies e GDPR
- Conteúdo de lista de categorias ou índices
- Cards de outros artigos ou notícias relacionadas
- Listas de links para outras seções do site
- Informações sobre outros filmes/séries que não são o foco do artigo
- Botões como "Read More", "Continue Reading", "Subscribe"
- Qualquer elemento de UI que não seja parte do texto do artigo
- Listas de episódios, listas de filmes, ou índices de conteúdo que não fazem parte do artigo
- Texto promocional como "Sign up for our newsletter"

FORMATE o conteúdo usando HTML semântico:
- <h2> para subtítulos principais (seções do artigo)
- <h3> para subtítulos secundários
- <p> para parágrafos de texto
- <blockquote> para citações e declarações de fontes
- <ul>/<li> para listas não ordenadas APENAS se fizerem parte do conteúdo do artigo
- <ol>/<li> para listas ordenadas/cronológicas APENAS se fizerem parte do conteúdo
- <strong> para destaques importantes
- <em> para ênfase

REGRAS CRÍTICAS:
1. NÃO inclua o título principal (já temos separadamente)
2. Mantenha a hierarquia lógica do conteúdo
3. Preserve citações importantes com atribuição
4. Se o conteúdo estiver em inglês ou outro idioma, TRADUZA TUDO para Português do Brasil
5. Retorne APENAS o HTML formatado, sem explicações ou comentários
6. NÃO inclua cards de navegação, menus ou listas de links

Título original: ${title}

Conteúdo bruto:
${rawContent.slice(0, 12000)}`;

            const cleanResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{ role: "user", content: cleanPrompt }],
              }),
            });

            if (cleanResponse.ok) {
              const cleanData = await cleanResponse.json();
              content = cleanData.choices?.[0]?.message?.content || "";
              
              // Remove markdown code blocks if AI returned them
              content = content.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

              // Validate translation: check if content is still predominantly in English
              if (typedSource.is_foreign && content.length > 200) {
                const textOnly = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                const words = textOnly.split(/\s+/).filter((w: string) => w.length > 3);
                const sampleWords = words.slice(0, 80);
                const englishWords = ["the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "from", "they", "been", "have", "said", "each", "which", "their", "will", "other", "about", "many", "then", "them", "some", "would", "make", "like", "into", "could", "time", "very", "when", "come", "just", "know", "take", "people", "also", "after", "year", "because", "most", "only", "over", "such", "than", "first", "been", "now", "long", "great", "since", "movie", "film", "show", "series", "according", "however", "while", "during", "between", "before", "being", "should", "those", "still", "where", "what", "there", "through"];
                const engCount = sampleWords.filter((w: string) => englishWords.includes(w.toLowerCase())).length;
                const engRatio = engCount / Math.max(sampleWords.length, 1);
                
                if (engRatio > 0.15) {
                  console.log(`Content still in English (${(engRatio * 100).toFixed(0)}% EN words), retrying translation...`);
                  
                  const retryPrompt = `TRADUZA o seguinte conteúdo HTML de INGLÊS para PORTUGUÊS DO BRASIL. Mantenha todas as tags HTML intactas. Traduza TODO o texto. NÃO deixe nenhuma frase em inglês. Retorne APENAS o HTML traduzido.\n\n${content.slice(0, 12000)}`;
                  
                  try {
                    const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${lovableApiKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: "google/gemini-3-flash-preview",
                        messages: [{ role: "user", content: retryPrompt }],
                      }),
                    });
                    
                    if (retryResponse.ok) {
                      const retryData = await retryResponse.json();
                      const retryContent = (retryData.choices?.[0]?.message?.content || "")
                        .replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
                      
                      if (retryContent.length > 200) {
                        content = retryContent;
                        console.log(`Translation retry successful (${content.length} chars)`);
                      }
                    }
                  } catch (retryErr) {
                    console.log(`Translation retry failed: ${retryErr}`);
                  }
                }
              }
              
              // CRITICAL: Validate that AI returned actual article content, not an error message
              const invalidContentPatterns = [
                /não apresenta o corpo principal/i,
                /conteúdo fornecido não/i,
                /por favor,? forneça/i,
                /elementos de interface/i,
                /não foi possível extrair/i,
                /conteúdo insuficiente/i,
                /não há conteúdo/i,
                /texto consiste exclusivamente/i,
                /devem ser removidos/i,
                /extração e tradução/i,
                /controles de player/i,
                /widgets de redes sociais/i,
                /formulários de submissão/i,
                /recaptcha/i,
                /^<p>\s*O conteúdo/i,
                /I cannot fulfill/i,
                /I can't help/i,
                /unable to extract/i,
                /no article content/i,
              ];
              
              const isInvalidContent = invalidContentPatterns.some(pattern => pattern.test(content));
              
              if (isInvalidContent) {
                console.log(`AI returned error message instead of content for: ${title}`);
                console.log(`Content preview: ${content.slice(0, 200)}`);
                skippedCount++;
                continue;
              }
              
              // Also check if content is too short or doesn't contain actual text
              const textOnlyContent = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
              if (textOnlyContent.length < 200) {
                console.log(`AI returned insufficient content for: ${title} (${textOnlyContent.length} chars)`);
                skippedCount++;
                continue;
              }
              
              // Always translate title and excerpt for foreign sources
              const commonEnglishWords = /\b(the|and|for|with|that|from|have|this|will|about|after|also|been|before|between|could|during|first|into|just|know|like|make|many|more|most|much|only|other|over|said|should|some|such|than|their|them|then|there|these|they|through|very|were|what|when|where|which|while|would|your|director|takes|netflix|series|movie|film|show|season|episode|star|cast|trailer|release|streaming)\b/gi;
              const enMatches = (title + " " + excerpt).match(commonEnglishWords) || [];
              const titleWords = (title + " " + excerpt).split(/\s+/).length;
              const enWordRatio = enMatches.length / Math.max(titleWords, 1);
              const needsTranslation = typedSource.is_foreign || enWordRatio > 0.15;
              
              if (needsTranslation && content) {
                console.log(`Translating title/excerpt (foreign=${typedSource.is_foreign}, enRatio=${(enWordRatio * 100).toFixed(0)}%): ${title.slice(0, 60)}`);
                const translateMetaResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${lovableApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: [
                      {
                        role: "system",
                        content: `Traduza o título e resumo abaixo para Português do Brasil. Mantenha nomes próprios quando conhecidos no Brasil (ex: Netflix, Disney). Traduza títulos de filmes/séries para o nome conhecido no Brasil quando existir (ex: "Crash Landing on You" → "Pousando no Amor"). Responda SOMENTE com JSON válido: {"title": "...", "excerpt": "..."}`,
                      },
                      {
                        role: "user",
                        content: `Título: ${title}\nResumo: ${excerpt}`,
                      },
                    ],
                  }),
                });

                if (translateMetaResponse.ok) {
                  const metaData = await translateMetaResponse.json();
                  const metaContent = metaData.choices?.[0]?.message?.content || "";
                  try {
                    // Clean markdown code blocks if present
                    const cleanMeta = metaContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
                    const jsonMatch = cleanMeta.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const parsed = JSON.parse(jsonMatch[0]);
                      if (parsed.title && parsed.title.length > 5) {
                        console.log(`Title translated: "${title}" → "${parsed.title}"`);
                        title = parsed.title;
                      }
                      if (parsed.excerpt && parsed.excerpt.length > 5) excerpt = parsed.excerpt;
                    }
                  } catch (e) {
                    console.log(`Could not parse translated metadata: ${metaContent.slice(0, 100)}`);
                  }
                } else {
                  console.log(`Title translation failed: ${translateMetaResponse.status}`);
                }
              }
            } else {
              console.error("Failed to clean content with AI");
              content = rawContent;
            }
          } else {
            content = rawContent;
          }

          if (!content || content.length < 200) {
            console.log(`Skipping article with insufficient content: ${title}`);
            skippedCount++;
            continue;
          }

          let category = "brasil";
          let tags: string[] = [];

          if (lovableApiKey) {
            const categoryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  {
                    role: "system",
                    content: `Analise a notícia e retorne em JSON:
{
  "category": "uma das categorias: ${categories.join(", ")}",
  "tags": ["tag1", "tag2", "tag3"]
}

REGRAS PARA CATEGORIA (MUITO IMPORTANTE):
- "entretenimento": filmes, séries, TV, streaming, Netflix, Disney+, HBO, celebridades, música, shows, K-drama, anime, premiações (Oscar, Grammy, Emmy)
- "tecnologia": gadgets, apps, inteligência artificial, redes sociais, startups, cibersegurança
- "esportes": futebol, basquete, tênis, MMA, Fórmula 1, Olimpíadas, campeonatos
- "economia": mercado financeiro, bolsa, investimentos, inflação, PIB, empresas, negócios
- "politica": governo, eleições, congresso, leis, partidos, diplomacia
- "mundo": eventos internacionais que NÃO se encaixam em outras categorias específicas
- "brasil": eventos nacionais que NÃO se encaixam em outras categorias específicas
- "saude": medicina, hospitais, vacinas, doenças, bem-estar, saúde mental
- "ciencia": descobertas científicas, pesquisa, espaço, NASA, meio ambiente, clima
- "cultura": artes, literatura, teatro, dança, exposições, patrimônio cultural

ATENÇÃO: Um artigo sobre um diretor de séries coreanas e Netflix é "entretenimento", NÃO "brasil".
Um artigo sobre um time de futebol brasileiro é "esportes", NÃO "brasil".
Use "brasil" APENAS para assuntos nacionais genéricos que não se encaixam nas demais.

REGRAS PARA TAGS:
- Máximo 5 tags por artigo
- Cada tag deve ter NO MÁXIMO 3 palavras
- Use termos específicos e relevantes (nomes de pessoas, empresas, eventos, lugares)
- Evite tags genéricas como "notícia", "atualização", "novo"
- Tags devem estar em Português do Brasil

Exemplos de boas tags: "Piratas do Caribe", "Johnny Depp", "Disney", "Hollywood", "Sequência Filme"`,
                  },
                  {
                    role: "user",
                    content: `Título: ${title}\nResumo: ${excerpt}\nConteúdo: ${content.slice(0, 2000)}`,
                  },
                ],
              }),
            });

            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json();
              const responseContent = categoryData.choices?.[0]?.message?.content || "";
              try {
                const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.category && categories.includes(parsed.category.toLowerCase().trim())) {
                    category = parsed.category.toLowerCase().trim();
                  }
                  if (Array.isArray(parsed.tags)) {
                    tags = parsed.tags
                      .filter((t: unknown) => typeof t === "string" && t.length > 1 && t.length <= 30)
                      .slice(0, 5);
                  }
                }
              } catch (e) {
                // Try to extract just the category from plain text
                const detectedCategory = responseContent.toLowerCase().trim();
                if (categories.includes(detectedCategory)) {
                  category = detectedCategory;
                }
              }
            }
            
            console.log(`Categorized as: ${category}, tags: ${tags.join(", ")}`);
          }

          const slug = title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 80) + "-" + Date.now().toString(36);

          if (existingId) {
            const { error: updateError } = await supabase
              .from("articles")
              .update({
                title,
                excerpt: excerpt.slice(0, 500),
                content,
                image_url: imageUrl,
                video_url: videoUrl,
                category,
                is_translated: typedSource.is_foreign,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingId);

            if (updateError) {
              console.error(`Failed to update article: ${updateError.message}`);
              continue;
            }

            processedCount++;
            console.log(`Updated article: ${title}`);
          } else {
            const { data: insertedArticle, error: insertError } = await supabase.from("articles").insert({
              source_id: typedSource.id,
              title,
              slug,
              excerpt: excerpt.slice(0, 500),
              content,
              image_url: imageUrl,
              video_url: videoUrl,
              original_url: itemUrl,
              category,
              is_featured: processedCount === 0,
              is_translated: typedSource.is_foreign,
              published_at: new Date().toISOString(),
            }).select("id").single();

            if (insertError) {
              console.error(`Failed to insert article: ${insertError.message}`);
              continue;
            }

            // Insert tags for the new article
            if (insertedArticle && tags.length > 0) {
              const tagInserts = tags.map(tag => ({
                article_id: insertedArticle.id,
                tag: tag.trim(),
              }));
              
              const { error: tagsError } = await supabase.from("article_tags").insert(tagInserts);
              if (tagsError) {
                console.error(`Failed to insert tags: ${tagsError.message}`);
              } else {
                console.log(`Inserted ${tags.length} tags: ${tags.join(", ")}`);
              }
            }

            // Auto-generate FAQ for new article
            if (insertedArticle && lovableApiKey && content && content.length > 500) {
              try {
                console.log(`Generating FAQ for: ${title}`);
                const faqResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${lovableApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-lite",
                    messages: [
                      {
                        role: "system",
                        content: `Gere exatamente 4 perguntas frequentes (FAQ) em português brasileiro para o artigo. As perguntas devem ser naturais. As respostas devem ter 2-3 frases concisas.`,
                      },
                      {
                        role: "user",
                        content: `Título: ${title}\nCategoria: ${category}\n\nConteúdo:\n${content.slice(0, 3000)}`,
                      },
                    ],
                    tools: [
                      {
                        type: "function",
                        function: {
                          name: "generate_faqs",
                          description: "Generate FAQ questions and answers",
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

                if (faqResponse.ok) {
                  const faqData = await faqResponse.json();
                  const toolCall = faqData.choices?.[0]?.message?.tool_calls?.[0];
                  if (toolCall?.function?.arguments) {
                    const parsed = JSON.parse(toolCall.function.arguments);
                    const faqs = (parsed.faqs || []).slice(0, 4);
                    if (faqs.length > 0) {
                      const faqInserts = faqs.map((faq: { question: string; answer: string }, idx: number) => ({
                        article_id: insertedArticle.id,
                        question: faq.question,
                        answer: faq.answer,
                        position: idx,
                      }));
                      const { error: faqError } = await supabase.from("article_faqs").insert(faqInserts);
                      if (faqError) {
                        console.error(`Failed to insert FAQs: ${faqError.message}`);
                      } else {
                        console.log(`Generated ${faqs.length} FAQs for: ${title}`);
                      }
                    }
                  }
                } else {
                  console.log(`FAQ generation failed (${faqResponse.status}), skipping`);
                }
              } catch (faqErr) {
                console.log(`FAQ generation error: ${faqErr}`);
              }
            }

            processedCount++;
            console.log(`Inserted article: ${title}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${itemUrl}:`, error);
      }
    }

    const itemType = isProductSource ? "produtos" : "artigos";
    console.log(`Scraping complete. Processed ${processedCount} ${itemType}, skipped ${skippedCount}.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesCount: isProductSource ? 0 : processedCount,
        productsCount: isProductSource ? processedCount : 0,
        skippedCount,
        sourceType: typedSource.source_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
