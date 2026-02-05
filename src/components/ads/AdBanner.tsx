import { useEffect, useRef } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

// Component for Google AdSense integration
// To use: add your AdSense publisher ID to window.adsbygoogle
export function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    
    try {
      // Check if AdSense script is loaded
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <div ref={adRef} className="min-h-[100px] bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/20">
        {/* Placeholder for AdSense - replace with actual ad code */}
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: "100px" }}
          data-ad-client="ca-pub-XXXXXXXXXX" // Replace with your publisher ID
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
        {/* Dev placeholder */}
        <span className="text-xs text-muted-foreground absolute pointer-events-none">
          Espaço para Anúncio
        </span>
      </div>
    </div>
  );
}

// Sidebar ad slot
export function SidebarAd({ className = "" }: { className?: string }) {
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
