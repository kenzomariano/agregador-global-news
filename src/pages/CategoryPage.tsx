import { useParams, useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { ArticleCard } from "@/components/news/ArticleCard";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useArticles, type Article } from "@/hooks/useArticles";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { CATEGORIES, ENTERTAINMENT_SUBCATEGORIES, type CategoryKey } from "@/lib/categories";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;

function CategoryItemListJsonLd({ articles, category }: { articles: Article[]; category: string }) {
  useEffect(() => {
    const id = "category-itemlist-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Notícias de ${category}`,
      itemListElement: articles.slice(0, 10).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${window.location.origin}/noticia/${a.slug}`,
        name: a.title,
      })),
    });
    return () => {
      const el = document.getElementById(id);
      if (el?.parentNode) el.parentNode.removeChild(el);
    };
  }, [articles, category]);
  return null;
}

function PaginationLinks({ page, totalPages, category }: { page: number; totalPages: number; category: string }) {
  useEffect(() => {
    // Add rel prev/next for crawlers
    const removePrevNext = () => {
      document.querySelector('link[rel="prev"]')?.remove();
      document.querySelector('link[rel="next"]')?.remove();
    };
    removePrevNext();

    if (page > 1) {
      const prev = document.createElement("link");
      prev.rel = "prev";
      prev.href = `${window.location.origin}/categoria/${category}${page > 2 ? `?page=${page - 1}` : ""}`;
      document.head.appendChild(prev);
    }
    if (page < totalPages) {
      const next = document.createElement("link");
      next.rel = "next";
      next.href = `${window.location.origin}/categoria/${category}?page=${page + 1}`;
      document.head.appendChild(next);
    }

    return removePrevNext;
  }, [page, totalPages, category]);

  return null;
}

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const categoryKey = category as CategoryKey;
  const categoryInfo = CATEGORIES[categoryKey];
  const [subcategoryFilter, setSubcategoryFilter] = useState<string | null>(null);
  
  const { data, isLoading } = useArticles(categoryKey, PER_PAGE, page);
  const articles = data?.articles;
  const isEntertainment = categoryKey === "entretenimento";

  const filteredArticles = subcategoryFilter
    ? articles?.filter((a) => a.subcategory === subcategoryFilter)
    : articles;
  const total = subcategoryFilter ? (filteredArticles?.length || 0) : (data?.total || 0);
  const totalPages = subcategoryFilter ? 1 : Math.ceil(total / PER_PAGE);

  if (!categoryInfo) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Categoria não encontrada</h1>
        <p className="text-muted-foreground">A categoria solicitada não existe.</p>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`Notícias de ${categoryInfo.label}${page > 1 ? ` - Página ${page}` : ""}`}
        description={`Últimas notícias de ${categoryInfo.label} no Brasil e no mundo. Fique por dentro das principais informações e atualizações.`}
        keywords={[categoryInfo.label.toLowerCase(), "notícias", "brasil", "atualidades"]}
      />
      <PaginationLinks page={page} totalPages={totalPages} category={categoryKey} />

      <div className="container py-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: categoryInfo.label },
        ]} />

        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-primary" />
            {categoryInfo.label}
          </h1>
          <p className="text-muted-foreground mt-2">
            Últimas notícias e atualizações de {categoryInfo.label}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 xl:col-span-9">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                <CategoryItemListJsonLd articles={articles} category={categoryInfo.label} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginação">
                    {page > 1 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/categoria/${categoryKey}${page > 2 ? `?page=${page - 1}` : ""}`}>
                          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Link>
                      </Button>
                    )}
                    <span className="text-sm text-muted-foreground px-3">
                      Página {page} de {totalPages}
                    </span>
                    {page < totalPages && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/categoria/${categoryKey}?page=${page + 1}`}>
                          Próxima <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground">
                  Nenhuma notícia encontrada nesta categoria ainda.
                </p>
              </div>
            )}
          </div>

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
