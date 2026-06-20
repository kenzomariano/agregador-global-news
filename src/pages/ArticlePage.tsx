import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArticleFullView } from "@/components/news/ArticleFullView";
import { ArticleNavigation } from "@/components/news/ArticleNavigation";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { SidebarAd } from "@/components/ads/AdBanner";
import { SidebarProducts } from "@/components/products/SidebarProducts";
import { useArticleBySlug, useRelatedArticles } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading } = useArticleBySlug(slug || "");

  // Stack of loaded articles for infinite scroll
  const [extraArticles, setExtraArticles] = useState<Article[]>([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [noMoreArticles, setNoMoreArticles] = useState(false);
  const [visibleSlug, setVisibleSlug] = useState(slug);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentSlugRef = useRef(slug);

  // Refs mirror state so the loader callback stays stable
  const articleRef = useRef<Article | null>(null);
  const extrasRef = useRef<Article[]>([]);
  const loadingNextRef = useRef(false);
  const noMoreRef = useRef(false);

  useEffect(() => { articleRef.current = article ?? null; }, [article]);
  useEffect(() => { extrasRef.current = extraArticles; }, [extraArticles]);
  useEffect(() => { loadingNextRef.current = isLoadingNext; }, [isLoadingNext]);
  useEffect(() => { noMoreRef.current = noMoreArticles; }, [noMoreArticles]);

  // Reset extras when initial slug changes (user navigated via link)
  useEffect(() => {
    if (slug !== currentSlugRef.current) {
      currentSlugRef.current = slug;
      setVisibleSlug(slug);
      setExtraArticles([]);
      setNoMoreArticles(false);
      window.scrollTo({ top: 0 });
    }
  }, [slug]);

  // Check for redirects when article not found
  useEffect(() => {
    if (!isLoading && !article && slug) {
      supabase
        .from("article_redirects")
        .select("new_slug")
        .eq("old_slug", slug)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.new_slug) {
            navigate(`/noticia/${data.new_slug}`, { replace: true });
          }
        });
    }
  }, [isLoading, article, slug, navigate]);

  // All articles in view (primary + extras) — memoized for referential stability
  const allArticles = useMemo(
    () => (article ? [article, ...extraArticles] : []),
    [article, extraArticles]
  );

  // Stable loader reads from refs
  const loadNextArticle = useCallback(async () => {
    if (loadingNextRef.current || noMoreRef.current) return;
    const primary = articleRef.current;
    if (!primary) return;
    const stack = [primary, ...extrasRef.current];
    const lastArticle = stack[stack.length - 1];
    if (!lastArticle.published_at) return;

    loadingNextRef.current = true;
    setIsLoadingNext(true);
    try {
      const ids = stack.map((a) => a.id);
      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("status", "published")
        .lt("published_at", lastArticle.published_at)
        .not("id", "in", `(${ids.join(",")})`)
        .order("published_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        setNoMoreArticles(true);
      } else {
        setExtraArticles((prev) => [...prev, ...(data as Article[])]);
      }
    } catch {
      // silently fail
    } finally {
      loadingNextRef.current = false;
      setIsLoadingNext(false);
    }
  }, []);

  // Infinite scroll observer — registered once
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextArticle();
        }
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNextArticle]);

  // Stable callback: update URL/SEO when scrolling to a different article's title
  const handleTitleVisible = useCallback((nextSlug: string) => {
    if (nextSlug !== currentSlugRef.current) {
      window.history.replaceState(null, "", `/noticia/${nextSlug}`);
      currentSlugRef.current = nextSlug;
      setVisibleSlug(nextSlug);
    }
  }, []);

  const seoArticle = useMemo(
    () => allArticles.find((a) => a.slug === visibleSlug) || article,
    [allArticles, visibleSlug, article]
  );

  useRelatedArticles(article?.id || "", article?.category as CategoryKey, 4);

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-4 w-48 mb-8" />
          <Skeleton className="aspect-video w-full rounded-lg mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Notícia não encontrada</h1>
        <p className="text-muted-foreground mb-4">A notícia solicitada não existe ou foi removida.</p>
        <Button asChild>
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    );
  }

  const category = CATEGORIES[article.category as CategoryKey];
  const seoCategory = seoArticle ? CATEGORIES[seoArticle.category as CategoryKey] : category;

  return (
    <>
      <SEOHead
        title={seoArticle?.title || article.title}
        description={seoArticle?.excerpt || seoArticle?.title || article.title}
        image={seoArticle?.image_url || undefined}
        type="article"
        publishedTime={seoArticle?.published_at || undefined}
        author={seoArticle?.news_sources?.name}
        keywords={[
          seoCategory?.label.toLowerCase() || seoArticle?.category || article.category,
          "notícias",
          "brasil",
        ]}
      />

      <article className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 xl:col-span-9">
            <StructuredBreadcrumb items={[
              { label: "Início", href: "/" },
              { label: category?.label || article.category, href: `/categoria/${article.category}` },
              { label: article.title },
            ]} />

            <ArticleFullView
              article={article}
              isFirst
              onTitleVisible={handleTitleVisible}
            />

            <ArticleNavigation publishedAt={article.published_at} articleId={article.id} />

            {extraArticles.map((extraArticle) => (
              <ArticleFullView
                key={extraArticle.id}
                article={extraArticle}
                onTitleVisible={handleTitleVisible}
              />
            ))}

            <div ref={loadMoreRef} className="h-4" />

            {isLoadingNext && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {noMoreArticles && extraArticles.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Você chegou ao fim das notícias disponíveis.
              </p>
            )}
          </div>

          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-32 space-y-6">
              <SidebarProducts
                category={article.category}
                limit={3}
                title="Ofertas Relacionadas"
              />
              <TrendingSidebar />
              <SidebarAd />
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
