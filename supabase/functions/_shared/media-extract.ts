// Helpers to preserve images and embedded videos through AI cleaning/translation.
// Extracts <img> and <iframe> sources from raw HTML, then re-injects any missing
// ones into the AI-processed HTML so embeds survive the rewrite.

const EMBED_HOSTS = [
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "tiktok.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "spotify.com",
  "soundcloud.com",
];

const IMG_BLOCKLIST = [
  /1x1/i,
  /pixel/i,
  /spacer/i,
  /blank\.(gif|png)/i,
  /tracking/i,
  /gravatar/i,
  /avatar/i,
  /logo/i,
  /icon/i,
  /ads?\//i,
  /doubleclick/i,
  /googlesyndication/i,
  /\.svg(\?|$)/i,
];

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    // Strip tracking params that change between sources but reference the same media
    const dropParams = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","feature","si","ref","ref_src","fbclid","gclid"];
    dropParams.forEach((p) => url.searchParams.delete(p));
    // Drop default ports + trailing slash + lowercase host
    url.hostname = url.hostname.toLowerCase();
    let s = url.toString().replace(/\/$/, "");
    return s.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

// Returns a canonical embed identifier (provider + content id) when possible so the
// same video referenced via different URLs (youtu.be vs youtube.com/watch vs /embed/)
// is treated as a duplicate. Falls back to the normalized URL.
function canonicalEmbedKey(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // YouTube
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\/+/, "").split("/")[0];
      if (id) return `youtube:${id.toLowerCase()}`;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v) return `youtube:${v.toLowerCase()}`;
      const m = url.pathname.match(/^\/(embed|shorts|v|live)\/([^\/?#]+)/);
      if (m) return `youtube:${m[2].toLowerCase()}`;
    }
    // Vimeo
    if (host.endsWith("vimeo.com")) {
      const m = url.pathname.match(/(\d{4,})/);
      if (m) return `vimeo:${m[1]}`;
    }
    // TikTok
    if (host.endsWith("tiktok.com")) {
      const m = url.pathname.match(/\/video\/(\d+)/) || url.pathname.match(/\/embed\/v\d+\/(\d+)/);
      if (m) return `tiktok:${m[1]}`;
    }
    // Twitter / X
    if (host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com")) {
      const m = url.pathname.match(/\/status\/(\d+)/);
      if (m) return `tweet:${m[1]}`;
    }
    // Instagram
    if (host.endsWith("instagram.com")) {
      const m = url.pathname.match(/\/(p|reel|tv)\/([^\/?#]+)/);
      if (m) return `instagram:${m[2].toLowerCase()}`;
    }
    // Spotify / SoundCloud / Twitch
    if (host.endsWith("spotify.com")) {
      const m = url.pathname.match(/\/(track|episode|playlist|album|show)\/([^\/?#]+)/);
      if (m) return `spotify:${m[1]}:${m[2].toLowerCase()}`;
    }
  } catch { /* ignore */ }
  return `url:${normalizeUrl(u)}`;
}

// Normalize an image URL by stripping CDN size/quality query params and image-resizer
// path segments so the same source image isn't appended twice.
function canonicalImageKey(u: string): string {
  try {
    const url = new URL(u);
    const dropImgParams = ["w","h","width","height","quality","q","fit","crop","resize","format","fm","auto","dpr","ssl"];
    dropImgParams.forEach((p) => url.searchParams.delete(p));
    url.hostname = url.hostname.toLowerCase();
    // Common CDN size patterns: /-/resize/800x/, /w_800,h_600/, /800x600/
    let path = url.pathname
      .replace(/\/(w|h|c|q|f)_[^\/]+\//gi, "/")
      .replace(/\/\d{2,4}x\d{0,4}\//g, "/")
      .replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, "");
    url.pathname = path;
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}


export function extractImages(rawHtml: string): Array<{ src: string; alt: string }> {
  if (!rawHtml) return [];
  const results: Array<{ src: string; alt: string }> = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHtml)) !== null) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bdata-lazy-src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (!src || src.startsWith("data:")) continue;
    if (!/^https?:\/\//i.test(src)) continue;
    if (IMG_BLOCKLIST.some((p) => p.test(src))) continue;
    const key = canonicalImageKey(src);
    if (seen.has(key)) continue;
    seen.add(key);
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    results.push({ src, alt: (altMatch?.[1] || "").trim() });
  }
  return results;
}

export function extractIframes(rawHtml: string): string[] {
  if (!rawHtml) return [];
  const results: string[] = [];
  const seen = new Set<string>();
  const re = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHtml)) !== null) {
    const src = m[1].trim();
    if (!/^https?:\/\//i.test(src)) continue;
    try {
      const host = new URL(src).hostname.toLowerCase();
      if (!EMBED_HOSTS.some((h) => host === h || host.endsWith("." + h))) continue;
    } catch {
      continue;
    }
    const key = canonicalEmbedKey(src);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(src);
  }
  return results;
}


function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

function imgFigure(img: { src: string; alt: string }): string {
  const alt = htmlEscape(img.alt || "");
  const captionHtml = img.alt
    ? `<figcaption class="text-sm text-muted-foreground mt-2">${htmlEscape(img.alt)}</figcaption>`
    : "";
  return `<figure class="my-6"><img src="${htmlEscape(img.src)}" alt="${alt}" loading="lazy" class="w-full h-auto rounded-lg" />${captionHtml}</figure>`;
}

function iframeEmbed(src: string): string {
  return `<figure class="my-6 aspect-video"><iframe src="${htmlEscape(src)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-lg" frameborder="0"></iframe></figure>`;
}

// Re-inject images/iframes that exist in rawHtml but were dropped by the AI.
// Also normalizes any inline <img> tags so they render responsively.
export function mergeMediaIntoContent(
  cleanedHtml: string,
  rawHtml: string,
  options?: { coverImageUrl?: string | null; maxImages?: number; maxIframes?: number }
): string {
  if (!cleanedHtml) return cleanedHtml;
  const maxImg = options?.maxImages ?? 8;
  const maxIfr = options?.maxIframes ?? 4;
  const coverKey = options?.coverImageUrl ? normalizeUrl(options.coverImageUrl) : null;

  const presentImg = new Set<string>();
  cleanedHtml.replace(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, (_, src) => {
    presentImg.add(normalizeUrl(src));
    return "";
  });
  const presentIfr = new Set<string>();
  cleanedHtml.replace(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, (_, src) => {
    presentIfr.add(normalizeUrl(src));
    return "";
  });

  const missingImages = extractImages(rawHtml)
    .filter((i) => {
      const k = normalizeUrl(i.src);
      return !presentImg.has(k) && (!coverKey || k !== coverKey);
    })
    .slice(0, maxImg);

  const missingIframes = extractIframes(rawHtml)
    .filter((src) => !presentIfr.has(normalizeUrl(src)))
    .slice(0, maxIfr);

  if (missingImages.length === 0 && missingIframes.length === 0) {
    return cleanedHtml;
  }

  const appended = [
    ...missingIframes.map(iframeEmbed),
    ...missingImages.map(imgFigure),
  ].join("\n");

  return `${cleanedHtml}\n${appended}`;
}

export const PRESERVE_MEDIA_INSTRUCTION = `PRESERVE TODAS as imagens (<img>) e vídeos embedados (<iframe> de YouTube, Vimeo, TikTok, Twitter/X, Instagram) que aparecerem no conteúdo original. Insira-os no HTML final, próximos aos parágrafos correspondentes, usando <figure><img ... /></figure> ou <figure><iframe ... /></figure>. NÃO descarte mídia do corpo do artigo — apenas remova banners de anúncio, logos do site, ícones de UI e pixels de tracking.`;
