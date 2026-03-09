import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { estimateReadingTime } from "@/lib/readingTime";
import type { Article } from "@/hooks/useArticles";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "featured" | "compact" | "horizontal";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const category = CATEGORIES[article.category as CategoryKey];
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";
  const readingTime = estimateReadingTime(article.content);

  if (variant === "featured") {
    return (
      <Link to={`/noticia/${article.slug}`} className="group block">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative aspect-[16/9] overflow-hidden">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-6xl">📰</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <Badge variant="secondary" className="mb-3">
                {category?.label || article.category}
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-serif line-clamp-3 group-hover:underline decoration-2 underline-offset-4">
                {article.title}
              </h2>
              {article.excerpt && (
                <p className="mt-2 text-white/80 line-clamp-2">{article.excerpt}</p>
              )}
              <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
                <span>{article.news_sources?.name || "Fonte"}</span>
                <span>•</span>
                <time dateTime={article.published_at || undefined}>{timeAgo}</time>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link to={`/noticia/${article.slug}`} className="group block">
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <div className="w-32 h-24 sm:w-40 sm:h-28 flex-shrink-0 overflow-hidden">
              {article.image_url ? (
                <img
                  src={article.image_url}
                  alt={article.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-2xl">📰</span>
                </div>
              )}
            </div>
            <CardContent className="flex-1 p-3 sm:p-4">
              <Badge variant="outline" className="mb-2 text-xs">
                {category?.label || article.category}
              </Badge>
              <h3 className="font-semibold font-serif line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{article.news_sources?.name}</span>
                <span>•</span>
                <time dateTime={article.published_at || undefined}>{timeAgo}</time>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link to={`/noticia/${article.slug}`} className="group block py-3 border-b last:border-0">
        <div className="flex items-start gap-3">
          <span className="text-2xl font-bold text-muted-foreground/50 tabular-nums">
            {article.views_count > 0 ? String(article.views_count).padStart(2, "0") : "—"}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs px-1.5">
                {category?.label || article.category}
              </Badge>
              <span>•</span>
              <time dateTime={article.published_at || undefined}>{timeAgo}</time>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/noticia/${article.slug}`} className="group block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl">📰</span>
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4">
          <Badge variant="outline" className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
            {category?.label || article.category}
          </Badge>
          <h3 className="text-sm sm:text-base font-semibold font-serif group-hover:text-primary transition-colors leading-snug">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2 hidden sm:block">{article.excerpt}</p>
          )}
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate max-w-[80px] sm:max-w-none">{article.news_sources?.name || "Fonte"}</span>
            <span>•</span>
            <time dateTime={article.published_at || undefined} className="shrink-0">{timeAgo}</time>
            {readingTime > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{readingTime} min</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
