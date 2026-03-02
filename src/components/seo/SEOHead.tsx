import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
  keywords?: string[];
}

export function SEOHead({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  author,
  keywords = [],
}: SEOHeadProps) {
  const fullTitle = `${title} | DESIGNE`;
  const currentUrl = url || window.location.href;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update meta tags
    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    updateMeta("description", description);
    updateMeta("keywords", keywords.join(", "));
    updateMeta("author", author || "DESIGNE");

    // Open Graph tags
    updateProperty("og:title", fullTitle);
    updateProperty("og:description", description);
    updateProperty("og:type", type);
    updateProperty("og:url", currentUrl);
    updateProperty("og:site_name", "DESIGNE");
    updateProperty("og:locale", "pt_BR");
    if (image) {
      updateProperty("og:image", image);
      updateProperty("og:image:alt", title);
      updateProperty("og:image:width", "1200");
      updateProperty("og:image:height", "630");
    } else {
      // Dynamic OG image fallback using a text-based generator
      const ogFallback = `https://og.lovable.dev/api/og?title=${encodeURIComponent(title)}&site=DESIGNE`;
      updateProperty("og:image", ogFallback);
      updateProperty("og:image:alt", title);
      updateProperty("og:image:width", "1200");
      updateProperty("og:image:height", "630");
    }

    // Twitter Card tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", description);
    const twitterImage = image || `https://og.lovable.dev/api/og?title=${encodeURIComponent(title)}&site=DESIGNE`;
    updateMeta("twitter:image", twitterImage);

    // Article specific
    if (type === "article" && publishedTime) {
      updateProperty("article:published_time", publishedTime);
      if (author) {
        updateProperty("article:author", author);
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;

    // JSON-LD structured data
    const existingJsonLd = document.querySelector('script[type="application/ld+json"]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    
    if (type === "article") {
      jsonLd.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: description,
        image: image || undefined,
        datePublished: publishedTime,
        author: {
          "@type": "Organization",
          name: author || "DESIGNE",
        },
        publisher: {
          "@type": "Organization",
          name: "DESIGNE",
          logo: {
            "@type": "ImageObject",
            url: `${window.location.origin}/favicon.ico`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": currentUrl,
        },
      });
    } else {
      jsonLd.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "DESIGNE",
        description: description,
        url: window.location.origin,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${window.location.origin}/buscar?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      });
    }
    
    document.head.appendChild(jsonLd);

    return () => {
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
    };
  }, [title, description, image, currentUrl, type, publishedTime, author, keywords, fullTitle]);

  return null;
}
