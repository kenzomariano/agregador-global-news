import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Clock, Eye, Globe, BookOpen } from "lucide-react";
import { estimateReadingTime } from "@/lib/readingTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleContent } from "@/components/news/ArticleContent";
import { ArticleTags } from "@/components/news/ArticleTags";
import { ShareButtons } from "@/components/news/ShareButtons";
import { LikeButton } from "@/components/news/LikeButton";
import { SaveButton } from "@/components/news/SaveButton";
import { CommentSection } from "@/components/news/CommentSection";
import { TMDBMentions } from "@/components/entertainment/TMDBMention";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { HorizontalAd, InArticleAd } from "@/components/ads/AdBanner";
import { ArticleFAQ } from "@/components/news/ArticleFAQ";
import { ArticleTableOfContents } from "@/components/news/ArticleTableOfContents";
import { useIncrementViews } from "@/hooks/useArticles";
import { useArticleTMDBMentions } from "@/hooks/useArticleTMDBMentions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";

interface ArticleFullViewProps {
  article: Article;
  isFirst?: boolean;
  onTitleVisible?: (slug: string) => void;
}

export function ArticleFullView({ article, isFirst = false, onTitleVisible }: ArticleFullViewProps) {
  const incrementViews = useIncrementViews();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxAlt, setLightboxAlt] = useState("");

  const { data: autoTmdbMentions } = useArticleTMDBMentions(
    article.content || null,
    article.title,
    article.category
  );

  // Load saved/curated TMDB mentions from DB (admin-edited)
  const { data: savedTmdbMentions } = useQuery({
    queryKey: ["article-tmdb-mentions", article.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_tmdb_mentions")
        .select("*")
        .eq("article_id", article.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Use saved mentions if available, otherwise auto-detected
  const tmdbMentions = savedTmdbMentions && savedTmdbMentions.length > 0
    ? savedTmdbMentions.map((m: any) => ({
        id: m.id,
        tmdb_id: m.tmdb_id,
        media_type: m.media_type,
        title: m.title,
        original_title: m.original_title,
        poster_path: m.poster_path,
        backdrop_path: m.backdrop_path,
        overview: m.overview,
        release_date: m.release_date,
        vote_average: m.vote_average ? Number(m.vote_average) : null,
        popularity: m.popularity ? Number(m.popularity) : null,
        genre_ids: m.genre_ids,
        is_trending: false,
      }))
    : autoTmdbMentions;

  // Increment views
  useEffect(() => {
    if (article.id) {
      incrementViews.mutate(article.id);
    }
  }, [article.id]);

  // Observe title for URL updates
  useEffect(() => {
    if (!titleRef.current || !onTitleVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onTitleVisible(article.slug);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-80px 0px 0px 0px" }
    );

    observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, [article.slug, onTitleVisible]);

  const handleImageClick = (src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
    setLightboxOpen(true);
  };

  const category = CATEGORIES[article.category as CategoryKey];
  const readingTime = estimateReadingTime(article.content);
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";
  const articleUrl = `/noticia/${article.slug}`;

  return (
    <>
      <div className={!isFirst ? "border-t-4 border-primary/20 pt-8 mt-8" : ""}>
        {/* Article header */}
        <header className="mb-6">
          <Badge variant="outline" className="mb-4">
            <Link to={`/categoria/${article.category}`}>
              {category?.label || article.category}
            </Link>
          </Badge>

          <h1
            ref={titleRef}
            className="text-3xl md:text-4xl font-bold font-serif leading-tight mb-4"
          >
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
              <span>{(article.views_count ?? 0).toLocaleString("pt-BR")} visualizações</span>
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
            <SaveButton articleId={article.id} />
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

        {/* Table of Contents */}
        <ArticleTableOfContents content={article.content} />

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
          <SaveButton articleId={article.id} />
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

        {/* FAQ */}
        <ArticleFAQ articleId={article.id} articleTitle={article.title} />
      </div>

      <ImageLightbox
        src={lightboxSrc}
        alt={lightboxAlt}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
