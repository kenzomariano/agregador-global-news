import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Clock, Eye, Globe, BookOpen } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { estimateReadingTime } from "@/lib/readingTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { ArticleContent } from "@/components/news/ArticleContent";
import { ArticleTags } from "@/components/news/ArticleTags";
import { ShareButtons } from "@/components/news/ShareButtons";
import { LikeButton } from "@/components/news/LikeButton";
import { SaveButton } from "@/components/news/SaveButton";
import { CommentSection } from "@/components/news/CommentSection";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { TMDBMentions } from "@/components/entertainment/TMDBMention";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { SidebarAd, HorizontalAd, InArticleAd } from "@/components/ads/AdBanner";
import { AffiliateProducts } from "@/components/products/AffiliateProducts";
import { useArticleBySlug, useRelatedArticles, useIncrementViews } from "@/hooks/useArticles";
import { useArticleTMDBMentions } from "@/hooks/useArticleTMDBMentions";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

interface ArticleWithVideo {
  video_url?: string | null;
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
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxAlt, setLightboxAlt] = useState("");
  
  const { data: tmdbMentions } = useArticleTMDBMentions(
    article?.content || null,
    article?.title || "",
    article?.category || ""
  );

  useEffect(() => {
    if (article?.id) {
      incrementViews.mutate(article.id);
    }
  }, [article?.id]);
  
  const handleImageClick = (src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
    setLightboxOpen(true);
  };

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
  const readingTime = estimateReadingTime(article.content);
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";
  const articleUrl = `/noticia/${article.slug}`;

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
            <StructuredBreadcrumb items={[
              { label: "Início", href: "/" },
              { label: category?.label || article.category, href: `/categoria/${article.category}` },
              { label: article.title },
            ]} />

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

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="font-medium text-foreground">
                  {article.news_sources?.name || "Fonte"}
                </span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <time dateTime={article.published_at || undefined}>{timeAgo}</time>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{article.views_count.toLocaleString("pt-BR")} visualizações</span>
                </div>
                {readingTime > 0 && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{readingTime} min de leitura</span>
                  </div>
                )}
                {article.is_translated && (
                  <div className="flex items-center gap-1 text-primary">
                    <Globe className="h-4 w-4" />
                    <span>Traduzido</span>
                  </div>
                )}
              </div>

              {/* Share & Like */}
              <div className="flex flex-wrap items-center gap-3 border-y py-3">
                <LikeButton articleId={article.id} />
                <ShareButtons url={articleUrl} title={article.title} />
              </div>
            </header>

            {/* Embedded Video */}
            {(article as any).video_url && (
              <div className="mb-8">
                <div className="aspect-video rounded-lg overflow-hidden shadow-md">
                  <iframe
                    src={(article as any).video_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Vídeo do artigo"
                  />
                </div>
              </div>
            )}

            {/* Featured image with lightbox */}
            {article.image_url && !(article as any).video_url && (
              <figure className="mb-8">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(article.image_url!, article.title)}
                />
              </figure>
            )}

            {/* TMDB Mentions */}
            {tmdbMentions && tmdbMentions.length > 0 && (
              <TMDBMentions mentions={tmdbMentions} />
            )}

            <HorizontalAd className="mb-6" />

            {/* Article content */}
            <div className="mb-6">
              {article.content ? (
                <ArticleContent content={article.content} />
              ) : (
                <p className="text-muted-foreground italic">
                  Este artigo é um resumo. Clique no botão abaixo para ler o conteúdo completo na fonte original.
                </p>
              )}
            </div>

            <InArticleAd />

            {/* Tags */}
            <ArticleTags articleId={article.id} className="mb-8" />

            {/* Share & Like bottom */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-4 mb-6">
              <LikeButton articleId={article.id} />
              <ShareButtons url={articleUrl} title={article.title} />
            </div>

            <Card className="mb-8">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">Fonte original</p>
                  <p className="text-sm text-muted-foreground">{article.news_sources?.name}</p>
                </div>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={article.original_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ler na fonte
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Comments */}
            <CommentSection articleId={article.id} />

            {/* Related articles */}
            {relatedArticles && relatedArticles.length > 0 && (
              <section className="border-t pt-8 mt-8">
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
            <div className="sticky top-32 space-y-6">
              <AffiliateProducts
                category={article.category}
                limit={3}
                title="Ofertas Relacionadas"
                compact
              />
              <TrendingSidebar />
              <SidebarAd />
            </div>
          </aside>
        </div>
      </article>
      
      <ImageLightbox
        src={lightboxSrc}
        alt={lightboxAlt}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
