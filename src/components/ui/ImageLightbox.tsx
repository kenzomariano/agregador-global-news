import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt, open, onOpenChange }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);

  // Reset zoom when opening
  useEffect(() => {
    if (open) {
      setZoom(1);
    }
  }, [open]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, alt]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, handleZoomIn, handleZoomOut]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="text-white hover:bg-white/20"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="text-white hover:bg-white/20"
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Image container */}
        <div 
          className="w-full h-[95vh] flex items-center justify-center overflow-auto p-8"
          onClick={() => onOpenChange(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-zoom-in"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => {
              e.stopPropagation();
              if (zoom < 2) handleZoomIn();
              else handleZoomOut();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for making images clickable with lightbox
interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ClickableImage({ src, alt, className = "" }: ClickableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setOpen(true)}
      />
      <ImageLightbox src={src} alt={alt} open={open} onOpenChange={setOpen} />
    </>
  );
}
