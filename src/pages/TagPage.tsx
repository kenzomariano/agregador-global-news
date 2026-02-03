import { useParams, Link } from "react-router-dom";
import { Tag, ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { useArticlesByTag, usePopularTags } from "@/hooks/useArticleTags";

export default function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag) : "";
  
  const { data: articles, isLoading } = useArticlesByTag(decodedTag);
  const { data: popularTags } = usePopularTags(15);

  return (
    <>
      <SEOHead
        title={`${decodedTag} - Artigos`}
        description={`Todos os artigos sobre ${decodedTag}`}
      />

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-8 xl:col-span-9">
            {/* Header */}
            <div className="mb-6">
              <Button asChild variant="ghost" size="sm" className="mb-4">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold font-serif">{decodedTag}</h1>
                  <p className="text-muted-foreground">
                    {articles?.length || 0} artigos encontrados
                  </p>
                </div>
              </div>
            </div>

            {/* Articles */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h2>
                <p className="text-muted-foreground mb-4">
                  Não há artigos com a tag "{decodedTag}"
                </p>
                <Button asChild>
                  <Link to="/">Ver todas as notícias</Link>
                </Button>
              </div>
            )}

            {/* Popular Tags */}
            {popularTags && popularTags.length > 0 && (
              <div className="mt-12 pt-8 border-t">
                <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Tags Populares
                </h2>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(({ tag: t, count }) => (
                    <Link key={t} to={`/tag/${encodeURIComponent(t)}`}>
                      <Badge
                        variant={t === decodedTag ? "default" : "secondary"}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        {t}
                        <span className="ml-1 text-xs opacity-70">({count})</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-32">
              <TrendingSidebar />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
