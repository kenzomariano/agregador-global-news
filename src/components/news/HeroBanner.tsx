import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeroBannerProps {
  articles: Article[];
}

export function HeroBanner({ articles }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = articles.length;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, total]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  if (total === 0) return null;

  const article = articles[current];
  const category = CATEGORIES[article.category as CategoryKey];
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";

  return (
    <section className="relative w-full overflow-hidden rounded-xl mb-8">
      {/* Slides */}
      <div
        className="relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[16/6]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {articles.map((a, i) => {
          const cat = CATEGORIES[a.category as CategoryKey];
          const t = a.published_at
            ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: ptBR })
            : "recém publicado";

          return (
            <Link
              key={a.id}
              to={`/noticia/${a.slug}`}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === current ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              aria-hidden={i !== current}
              tabIndex={i === current ? 0 : -1}
            >
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
                  <span className="text-6xl sm:text-8xl">📰</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
                <Badge variant="secondary" className="mb-2 text-xs sm:text-sm">
                  {cat?.label || a.category}
                </Badge>
                <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white font-serif line-clamp-3 max-w-3xl">
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="mt-2 text-sm sm:text-base text-white/80 line-clamp-2 max-w-2xl">
                    {a.excerpt}
                  </p>
                )}
                <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/70">
                  <span className="truncate">{a.news_sources?.name || "Fonte"}</span>
                  <span>•</span>
                  <time>{t}</time>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full h-9 w-9 sm:h-10 sm:w-10"
            onClick={(e) => { e.preventDefault(); prev(); }}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full h-9 w-9 sm:h-10 sm:w-10"
            onClick={(e) => { e.preventDefault(); next(); }}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className={`h-2 sm:h-2.5 rounded-full transition-all ${
                i === current ? "bg-white w-5 sm:w-6" : "bg-white/50 hover:bg-white/70 w-2 sm:w-2.5"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
