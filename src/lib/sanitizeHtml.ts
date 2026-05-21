import DOMPurify from "dompurify";

// Allowed embed hosts for iframes (videos)
const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "player.vimeo.com",
  "vimeo.com",
  "open.spotify.com",
  "w.soundcloud.com",
  "platform.twitter.com",
  "www.instagram.com",
  "www.tiktok.com",
];

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function isSafeUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    // Allow relative URLs
    if (url.startsWith("/") || url.startsWith("#")) return true;
    const u = new URL(url, "https://example.com");
    return ALLOWED_PROTOCOLS.includes(u.protocol);
  } catch {
    return false;
  }
}

function isAllowedIframeSrc(src: string | null): boolean {
  if (!src) return false;
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    return ALLOWED_IFRAME_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

// Run a one-time hook setup. DOMPurify hooks are global so guard with a flag.
let hooksRegistered = false;
function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  DOMPurify.addHook("uponSanitizeElement", (node: any, data) => {
    if (data.tagName === "iframe") {
      const src = node.getAttribute("src");
      if (!isAllowedIframeSrc(src)) {
        node.parentNode?.removeChild(node);
      }
    }
  });

  DOMPurify.addHook("uponSanitizeAttribute", (node: any, data) => {
    // Block event handlers
    if (data.attrName.startsWith("on")) {
      data.keepAttr = false;
      return;
    }
    // Validate href/src URLs
    if (data.attrName === "href" || data.attrName === "src") {
      if (!isSafeUrl(data.attrValue)) {
        data.keepAttr = false;
        return;
      }
    }
    // Block dangerous style values (expression, url(javascript:...))
    if (data.attrName === "style") {
      const value = (data.attrValue || "").toLowerCase();
      if (value.includes("javascript:") || value.includes("expression(")) {
        data.keepAttr = false;
      }
    }
  });
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  if (typeof window === "undefined") return dirty; // SSR fallback (no DOM)
  ensureHooks();

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "hr", "div", "span",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "em", "b", "i", "u", "s", "mark", "small", "sub", "sup",
      "a", "img", "figure", "figcaption", "picture", "source",
      "ul", "ol", "li",
      "blockquote", "code", "pre", "kbd",
      "table", "thead", "tbody", "tr", "td", "th", "caption",
      "iframe",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "src", "srcset", "alt", "title", "loading", "decoding",
      "width", "height",
      "class", "id", "style",
      "colspan", "rowspan",
      "allow", "allowfullscreen", "frameborder", "referrerpolicy",
      "data-embed", "data-type",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "object", "embed", "form", "input", "textarea", "select", "button", "link", "meta", "base"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
    ADD_ATTR: ["target"],
  });
}

// Re-export for convenience
export { isSafeUrl, isAllowedIframeSrc };
