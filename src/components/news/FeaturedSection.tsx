import { Skeleton } from "@/components/ui/skeleton";
import { useFeaturedArticles } from "@/hooks/useArticles";
import { ArticleCard } from "./ArticleCard";

export function FeaturedSection() {
  const { data: articles, isLoading } = useFeaturedArticles(4);

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <section className="py-8">
        <div className="text-center py-12 bg-card rounded-lg border">
          <h2 className="text-2xl font-bold font-serif mb-2">Bem-vindo ao NewsHub Brasil</h2>
          <p className="text-muted-foreground mb-4">
            Cadastre suas fontes de notícias favoritas para começar a agregar conteúdo.
          </p>
          <a
            href="/admin/fontes"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar Fontes
          </a>
        </div>
      </section>
    );
  }

  const [mainArticle, ...sideArticles] = articles;

  return (
    <section className="py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mainArticle && (
          <ArticleCard article={mainArticle} variant="featured" />
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sideArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
