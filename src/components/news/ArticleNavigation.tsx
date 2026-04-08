import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdjacentArticles } from "@/hooks/useAdjacentArticles";

interface ArticleNavigationProps {
  publishedAt: string | null | undefined;
  articleId: string | undefined;
}

export function ArticleNavigation({ publishedAt, articleId }: ArticleNavigationProps) {
  const { data } = useAdjacentArticles(publishedAt, articleId);

  if (!data || (!data.prev && !data.next)) return null;

  return (
    <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6 mb-8" aria-label="Navegação entre artigos">
      {data.prev ? (
        <Link
          to={`/noticia/${data.prev.slug}`}
          className="group flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground">Anterior</span>
            <p className="text-sm font-medium line-clamp-2">{data.prev.title}</p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {data.next ? (
        <Link
          to={`/noticia/${data.next.slug}`}
          className="group flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-right sm:justify-end"
        >
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground">Próximo</span>
            <p className="text-sm font-medium line-clamp-2">{data.next.title}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
