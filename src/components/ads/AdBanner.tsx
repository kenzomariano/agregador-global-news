import { useEffect, useRef } from "react";
import { useActiveAds, type AdPlacement } from "@/hooks/useAdPlacements";

interface AdBannerProps {
  slot?: string;
  position?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

// Component for Google AdSense integration or custom banners
export function AdBanner({ slot, position, format = "auto", className = "" }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const { data: ads } = useActiveAds(position);

  // Find matching ad
  const ad = ads?.find((a) => a.position === position || a.slot_id === slot);

  useEffect(() => {
    if (isLoaded.current || !ad || ad.ad_type !== "adsense") return;
    
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [ad]);

  // Custom banner
  if (ad?.ad_type === "banner" && ad.banner_image) {
    return (
      <div className={`ad-container ${className}`}>
        <a 
          href={ad.banner_link || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src={ad.banner_image} 
            alt={ad.name} 
            className="w-full h-auto rounded-lg"
          />
        </a>
      </div>
    );
  }

  // AdSense or placeholder
  return (
    <div className={`ad-container ${className}`}>
      <div ref={adRef} className="min-h-[100px] bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/20 relative">
        {ad ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "100px" }}
            data-ad-client={ad.slot_id.startsWith("ca-pub") ? ad.slot_id : `ca-pub-${ad.slot_id}`}
            data-ad-slot={ad.slot_id}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            Espaço para Anúncio
          </span>
        )}
      </div>
    </div>
  );
}

// Sidebar ad slot
export function SidebarAd({ className = "" }: { className?: string }) {
  const { data: ads } = useActiveAds("sidebar");
  const ad = ads?.[0];

  if (ad?.ad_type === "banner" && ad.banner_image) {
    return (
      <div className={`${className}`}>
        <a 
          href={ad.banner_link || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src={ad.banner_image} 
            alt={ad.name} 
            className="w-full h-auto rounded-lg"
          />
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/20 ${className}`}>
      <div className="aspect-square flex items-center justify-center">
        <span className="text-xs text-muted-foreground text-center">
          Espaço para<br />Banner 300x250
        </span>
      </div>
    </div>
  );
}

// Horizontal banner for between content
export function HorizontalAd({ className = "" }: { className?: string }) {
  const { data: ads } = useActiveAds("between-sections");
  const ad = ads?.[0];

  if (ad?.ad_type === "banner" && ad.banner_image) {
    return (
      <div className={`my-6 ${className}`}>
        <a 
          href={ad.banner_link || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src={ad.banner_image} 
            alt={ad.name} 
            className="w-full h-auto rounded-lg"
          />
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/20 my-6 ${className}`}>
      <div className="h-24 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">
          Espaço para Banner Horizontal
        </span>
      </div>
    </div>
  );
}

// In-article ad (between paragraphs)
export function InArticleAd({ className = "" }: { className?: string }) {
  const { data: ads } = useActiveAds("article-inline");
  const ad = ads?.[0];

  if (ad?.ad_type === "banner" && ad.banner_image) {
    return (
      <div className={`my-4 ${className}`}>
        <a 
          href={ad.banner_link || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src={ad.banner_image} 
            alt={ad.name} 
            className="w-full h-auto rounded-lg"
          />
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-muted/30 rounded-lg p-3 border border-dashed border-muted-foreground/20 my-4 ${className}`}>
      <div className="h-20 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">
          Anúncio
        </span>
      </div>
    </div>
  );
}
