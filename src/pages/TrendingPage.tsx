import { SEOHead } from "@/components/seo/SEOHead";
import { ArticleCard } from "@/components/news/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingArticles } from "@/hooks/useArticles";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { TrendingUp } from "lucide-react";

export default function TrendingPage() {
  const { data: articles, isLoading } = useTrendingArticles(20);

  return (
    <>
      <SEOHead
        title="Notícias Mais Lidas"
        description="As notícias mais lidas e populares do momento no NewsHub Brasil. Confira o que está em alta no Brasil e no mundo."
        keywords={["mais lidas", "trending", "populares", "notícias", "brasil"]}
      />

      <div className="container py-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Mais Lidas" },
        ]} />
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Notícias Mais Lidas
          </h1>
          <p className="text-muted-foreground mt-2">
            As notícias mais populares do momento
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article, index) => (
              <div key={article.id} className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <ArticleCard article={article} variant="horizontal" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma notícia em destaque ainda. As visualizações serão contabilizadas conforme os usuários acessam o conteúdo.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
