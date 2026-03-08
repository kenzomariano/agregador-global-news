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
];

function normalizeImageUrl(url: string): string {
  return url
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/")
    .trim();
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

  const googleThumb = validCandidates.find((candidate) => isGoogleShoppingThumbnail(candidate));
  if (googleThumb) return googleThumb;

  const marketImage = validCandidates.find((candidate) => /mlstatic\.com\//i.test(candidate));
  if (marketImage) return marketImage;

  const shopeeImage = validCandidates.find((candidate) => /susercontent\.com\//i.test(candidate));
  if (shopeeImage) return shopeeImage;

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
        const searchQueries = (() => {
          const queries = [typedSource.name];

          try {
            const parsedSourceUrl = new URL(typedSource.url);
            const qParam = parsedSourceUrl.searchParams.get("q");
            if (qParam) {
              queries.push(decodeURIComponent(qParam.replace(/\+/g, " ")));
            }
          } catch {
            // ignore invalid URL format
          }

          return [...new Set(queries.map((query) => query.trim()).filter((query) => query.length > 2 && query.toLowerCase() !== "google shopping"))];
        })();

        console.log(`Using Google Shopping search to discover products for: ${searchQueries.join(", ")}`);

        const allFoundLinks: string[] = [];
        const isGoogleShoppingSource = /google\./i.test(typedSource.url) && /(shopping|udm=28|shoprs=)/i.test(typedSource.url);

        // First attempt: scrape source page directly (usually contains encrypted-tbn thumbnails)
        if (isGoogleShoppingSource) {
          try {
            const sourcePageResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: typedSource.url,
                formats: ["links", "markdown", "html"],
                onlyMainContent: false,
                waitFor: 2000,
              }),
            });

            if (sourcePageResponse.ok) {
              const sourcePageData = await sourcePageResponse.json();
              const sourceLinks = (sourcePageData.data?.links || [])
                .map((link: string) => extractCanonicalProductUrl(link))
                .filter((link: string) => /mercadolivre\.com\.br|shopee\.com\.br/i.test(link))
                .filter((link: string) => !/catalogo|catalogue|categoria|category/i.test(link));

              const sourceBlob = `${sourcePageData.data?.markdown || ""}\n${sourcePageData.data?.html || ""}\n${JSON.stringify(sourcePageData.data || {})}`;
              const shoppingThumbs = [
                ...(sourceBlob.match(/https?:\/\/encrypted-tbn\d*\.gstatic\.com\/shopping\?q=tbn:[^"'\s\\)]+/gi) || []),
              ].map(normalizeImageUrl);

              const uniqueSourceLinks = [...new Set(sourceLinks)];
              uniqueSourceLinks.forEach((link: string, index: number) => {
                const image = pickBestProductImage([shoppingThumbs[index] || ""]);
                searchResultsMap[link] = {
                  title: searchResultsMap[link]?.title || "",
                  description: searchResultsMap[link]?.description || "",
                  markdown: searchResultsMap[link]?.markdown || "",
                  image: image || searchResultsMap[link]?.image || "",
                };
              });

              allFoundLinks.push(...uniqueSourceLinks);
              console.log(`Found ${uniqueSourceLinks.length} product links from source page scrape`);
            }
          } catch (e) {
            console.error("Failed source page product discovery:", e);
          }
        }

        // Second attempt: Firecrawl search constrained to marketplaces
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
                query: `site:mercadolivre.com.br OR site:shopee.com.br ${query} preço`,
                limit: 25,
                scrapeOptions: { formats: ["markdown", "html"] },
              }),
            });

            const searchData = await searchResponse.json();
            if (searchResponse.ok && searchData.data) {
              for (const result of searchData.data) {
                const resultUrl = result.url || "";
                const cleanUrl = extractCanonicalProductUrl(resultUrl);

                const isMLProduct = /mercadolivre\.com\.br.*\/p\/MLB\d+/i.test(cleanUrl)
                  || /mercadolivre\.com\.br\/[a-z0-9-]+\/p\/MLB\d+/i.test(cleanUrl);
                const isShopeeProduct = /shopee\.com\.br\/.*-i\.\d+\.\d+/i.test(cleanUrl);

                const isCatalogPage = /catalogo|catalogue|categoria|category/i.test(cleanUrl);

                if ((isMLProduct || isShopeeProduct) && !isCatalogPage) {
                  allFoundLinks.push(cleanUrl);

                  const metadata = result.metadata || {};
                  const rawResultContent = `${JSON.stringify(result)}\n${result.markdown || ""}\n${result.html || ""}`;

                  const gstaticShoppingMatches =
                    rawResultContent.match(/https?:\/\/encrypted-tbn\d*\.gstatic\.com\/shopping\?q=tbn:[^"'\s\\)]+/gi) || [];

                  const markdownImageMatches = [
                    ...(result.markdown || "").matchAll(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/gi),
                  ].map((m) => m[1]);

                  const searchImage = pickBestProductImage([
                    ...gstaticShoppingMatches,
                    result.image,
                    metadata.image,
                    metadata.ogImage,
                    ...markdownImageMatches,
                    searchResultsMap[cleanUrl]?.image || "",
                  ].filter((candidate: unknown): candidate is string => typeof candidate === "string" && candidate.length > 0));

                  searchResultsMap[cleanUrl] = {
                    title: result.title || searchResultsMap[cleanUrl]?.title || "",
                    description: result.description || searchResultsMap[cleanUrl]?.description || "",
                    markdown: result.markdown || searchResultsMap[cleanUrl]?.markdown || "",
                    image: searchImage || searchResultsMap[cleanUrl]?.image || "",
                  };
                  console.log(`Found product via search: ${cleanUrl.slice(0, 100)}`);
                  if (searchImage) {
                    console.log(`  Search image: ${searchImage.slice(0, 120)}`);
                  }
                }
              }
            } else {
              console.error("Firecrawl search error:", searchData);
            }
          } catch (e) {
            console.error(`Search failed for query "${query}":`, e);
          }
        }

        const uniqueSearchLinks = [...new Set(allFoundLinks)];
        itemLinks = [...new Set([...itemLinks, ...uniqueSearchLinks])].slice(0, maxItems);
        console.log(`Found ${uniqueSearchLinks.length} product links from Google Shopping search`);
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

          if (!name || name.length < 3) {
            console.log(`Skipping product with invalid name: ${itemUrl}`);
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

            const fallbackImage = pickBestProductImage([
              ...gstaticShoppingMatches,
              ...mlImageMatches,
              ...shopeeImageMatches,
              ...markdownImageMatches,
            ]);

            if (fallbackImage) {
              imageUrl = fallbackImage;
              console.log(`Using fallback image candidate: ${imageUrl.slice(0, 100)}`);
            }
          }

          // Priority 3: Build image URL from MLB ID for Mercado Livre products
          if (!imageUrl) {
            const mlbMatch = cleanUrl.match(/\/p\/(MLB\d+)/i);
            if (mlbMatch) {
              imageUrl = `https://http2.mlstatic.com/D_NQ_NP_2X_${mlbMatch[1]}-F.webp`;
              console.log(`Built MLB image URL: ${imageUrl}`);
            }
          }

          // Priority 4: Scrape individual product page for og:image and/or price
          if (!imageUrl || !price) {
            try {
              console.log(`Scraping product page for image: ${cleanUrl}`);
              const productPageResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${firecrawlKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: cleanUrl,
                  formats: ["markdown"],
                  onlyMainContent: false,
                  waitFor: 1000,
                }),
              });

              if (productPageResponse.ok) {
                const pageData = await productPageResponse.json();
                const pageMeta = pageData.data?.metadata || {};
                const pageMarkdown = pageData.data?.markdown || "";

                // Try og:image first
                const ogImage = pageMeta.ogImage || pageMeta.image || "";
                imageUrl = pickBestProductImage([ogImage, imageUrl || ""]);
                if (imageUrl) {
                  console.log(`Got og:image from product page: ${imageUrl.slice(0, 100)}`);
                }

                // Try extracting from page markdown/html
                if (!imageUrl) {
                  const pageImageMatches = [
                    ...(pageMarkdown.matchAll(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/gi) || []),
                  ].map((m: RegExpMatchArray) => m[1]);
                  const pageMlImages = [...pageMarkdown.matchAll(/(https?:\/\/(?:http2\.)?mlstatic\.com\/[^\s)"'\\]+)/gi)].map((m: RegExpMatchArray) => m[1]);
                  const pageShopeeImages = [...pageMarkdown.matchAll(/(https?:\/\/[^\s)"'\\]*susercontent\.com[^\s)"'\\]*)/gi)].map((m: RegExpMatchArray) => m[1]);

                  const pageImage = pickBestProductImage([...pageMlImages, ...pageShopeeImages, ...pageImageMatches]);

                  if (pageImage) {
                    imageUrl = pageImage;
                    console.log(`Got image from product page markdown: ${imageUrl.slice(0, 100)}`);
                  }
                }

                // Also extract price from the product page if we don't have one
                if (!price) {
                  const pageText = `${pageMeta.title || ""}\n${pageMeta.description || ""}\n${pageMarkdown}`;
                  for (const pattern of pricePatterns) {
                    const matches = [...pageText.matchAll(pattern)];
                    if (matches.length > 0) {
                      const priceStr = matches[0][1].replace(/\./g, "").replace(",", ".");
                      const parsed = parseFloat(priceStr);
                      if (parsed > 0 && parsed < 1000000) {
                        price = parsed;
                        console.log(`Extracted price R$ ${parsed} from product page`);
                        break;
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.log(`Failed to scrape product page for image: ${e}`);
            }
          }

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
  "category": "categoria do produto"
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

          // Final image validation
          if (imageUrl && !isLikelyProductImage(imageUrl)) {
            console.log(`Rejected non-product image: ${imageUrl.slice(0, 80)}`);
            imageUrl = null;
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

            // Always translate to PT-BR and clean content
            const cleanPrompt = `Você é um editor de notícias profissional brasileiro.

TAREFA: Extraia APENAS o corpo principal do artigo e ${typedSource.is_foreign ? "traduza para Português do Brasil" : "mantenha em Português"}.

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
              
              // Always translate title and excerpt for foreign sources OR if content seems to be in English
              const needsTranslation = typedSource.is_foreign || /^[A-Za-z\s\-:,.'!?"()]+$/.test(title);
              
              if (needsTranslation && content) {
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
                        content: "Traduza para Português do Brasil. Mantenha nomes próprios, títulos de filmes/séries conhecidos. Responda APENAS em JSON: {\"title\": \"...\", \"excerpt\": \"...\"}",
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
                    const jsonMatch = metaContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const parsed = JSON.parse(jsonMatch[0]);
                      if (parsed.title) title = parsed.title;
                      if (parsed.excerpt) excerpt = parsed.excerpt;
                    }
                  } catch (e) {
                    console.log("Could not parse translated metadata");
                  }
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

REGRAS PARA TAGS:
- Máximo 5 tags por artigo
- Cada tag deve ter NO MÁXIMO 3 palavras
- Use termos específicos e relevantes (nomes de pessoas, empresas, eventos, lugares)
- Evite tags genéricas como "notícia", "atualização", "novo"
- Prefira substantivos em vez de verbos

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
