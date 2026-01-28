import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingArticles } from "@/hooks/useArticles";
import { ArticleCard } from "./ArticleCard";

export function TrendingSidebar() {
  const { data: articles, isLoading } = useTrendingArticles(5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Mais Lidas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="divide-y">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                to={`/noticia/${article.slug}`}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {article.views_count.toLocaleString("pt-BR")} visualizações
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma notícia em destaque ainda.
          </p>
        )}
        
        <Link
          to="/mais-lidas"
          className="block text-center text-sm text-primary hover:underline mt-4 pt-4 border-t"
        >
          Ver todas as mais lidas →
        </Link>
      </CardContent>
    </Card>
  );
}
