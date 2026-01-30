import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Clock, Eye, Globe, Play } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { useArticleBySlug, useRelatedArticles, useIncrementViews } from "@/hooks/useArticles";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

interface ArticleWithVideo {
  id: string;
  source_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  original_url: string;
  category: CategoryKey;
  views_count: number;
  is_featured: boolean;
  is_translated: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  news_sources?: {
    name: string;
    logo_url: string | null;
  };
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticleBySlug(slug || "");
  const { data: relatedArticles } = useRelatedArticles(
    article?.id || "",
    article?.category as CategoryKey,
    4
  );
  const incrementViews = useIncrementViews();

  useEffect(() => {
    if (article?.id) {
      incrementViews.mutate(article.id);
    }
  }, [article?.id]);

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
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";
  const publishedDate = article.published_at
    ? format(new Date(article.published_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })
    : null;

  return (
    <>
      <SEOHead
        title={article.title}
        description={article.excerpt || article.title}
        image={article.image_url || undefined}
        type="article"
        publishedTime={article.published_at || undefined}
        author={article.news_sources?.name}
        keywords={[
          category?.label.toLowerCase() || article.category,
          "notícias",
          "brasil",
        ]}
      />

      <article className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Breadcrumb */}
            <nav className="text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground">Início</Link>
              <span className="mx-2">/</span>
              <Link to={`/categoria/${article.category}`} className="hover:text-foreground">
                {category?.label || article.category}
              </Link>
            </nav>

            {/* Article header */}
            <header className="mb-6">
              <Badge variant="outline" className="mb-4">
                {category?.label || article.category}
              </Badge>
              
              <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight mb-4">
                {article.title}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-4">{article.excerpt}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">
                    {article.news_sources?.name || "Fonte"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <time dateTime={article.published_at || undefined}>{timeAgo}</time>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{article.views_count.toLocaleString("pt-BR")} visualizações</span>
                </div>
                {article.is_translated && (
                  <div className="flex items-center gap-1 text-primary">
                    <Globe className="h-4 w-4" />
                    <span>Traduzido</span>
                  </div>
                )}
              </div>
            </header>

            {/* Embedded Video */}
            {(article as ArticleWithVideo).video_url && (
              <div className="mb-8">
                <div className="aspect-video rounded-lg overflow-hidden shadow-md">
                  <iframe
                    src={(article as ArticleWithVideo).video_url!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Vídeo do artigo"
                  />
                </div>
              </div>
            )}

            {/* Featured image */}
            {article.image_url && !(article as ArticleWithVideo).video_url && (
              <figure className="mb-8">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full rounded-lg shadow-md"
                />
              </figure>
            )}

            {/* Article content */}
            <div className="prose prose-lg max-w-none mb-8">
              {article.content ? (
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              ) : (
                <p className="text-muted-foreground italic">
                  Este artigo é um resumo. Clique no botão abaixo para ler o conteúdo completo na fonte original.
                </p>
              )}
            </div>

            {/* Source link */}
            <Card className="mb-8">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">Fonte original</p>
                  <p className="text-sm text-muted-foreground">{article.news_sources?.name}</p>
                </div>
                <Button asChild variant="outline">
                  <a href={article.original_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ler na fonte
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Related articles */}
            {relatedArticles && relatedArticles.length > 0 && (
              <section className="border-t pt-8">
                <h2 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 rounded-full bg-primary" />
                  Notícias Relacionadas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedArticles.map((relatedArticle) => (
                    <ArticleCard key={relatedArticle.id} article={relatedArticle} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-32">
              <TrendingSidebar />
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
