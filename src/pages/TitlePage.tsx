import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Film, Tv, Star, Calendar, Clock, ExternalLink, Play, Users } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { RelatedNewsSection } from "@/components/news/RelatedNewsSection";
import { supabase } from "@/integrations/supabase/client";
import { getTMDBImageUrl, getYouTubeEmbedUrl } from "@/hooks/useTMDB";
import { useQuery } from "@tanstack/react-query";

interface CastMember {
  id: number; name: string; character: string; profile_path: string | null;
}
interface CrewMember {
  id: number; name: string; job: string; profile_path: string | null;
}

export default function TitlePage() {
  const { mediaType, tmdbId } = useParams<{ mediaType: "movie" | "tv"; tmdbId: string }>();
  const [playingTrailer, setPlayingTrailer] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tmdb-title", mediaType, tmdbId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "get_title_full", tmdb_id: Number(tmdbId), media_type: mediaType },
      });
      if (error) throw error;
      return data?.data;
    },
    enabled: !!tmdbId && !!mediaType,
  });

  const { data: mentionIds = [] } = useQuery({
    queryKey: ["title-mention-ids", tmdbId, mediaType],
    queryFn: async () => {
      const { data: mentions } = await supabase
        .from("article_tmdb_mentions")
        .select("article_id")
        .eq("tmdb_id", Number(tmdbId))
        .eq("media_type", mediaType);
      return (mentions || []).map((m) => m.article_id);
    },
    enabled: !!tmdbId,
  });

  if (isLoading || !data) {
    return (
      <div className="container py-8 max-w-5xl">
        <Skeleton className="h-64 w-full rounded-lg mb-6" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
      </div>
    );
  }

  const backdropUrl = getTMDBImageUrl(data.backdrop_path, "w780");
  const posterUrl = getTMDBImageUrl(data.poster_path, "w500");
  const year = data.release_date ? new Date(data.release_date).getFullYear() : null;
  const isMovie = mediaType === "movie";

  return (
    <>
      <SEOHead
        title={`${data.title}${year ? ` (${year})` : ""} - Sinopse, Elenco e Notícias`}
        description={data.overview?.slice(0, 160) || `Tudo sobre ${data.title}: sinopse, elenco, trailers e últimas notícias.`}
        image={backdropUrl || posterUrl || undefined}
        type="article"
        canonical={`https://agregador-global-news.lovable.app/titulo/${mediaType}/${tmdbId}`}
      />

      <article className="container py-6 max-w-5xl">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: isMovie ? "Filmes" : "Séries", href: `/categoria/entretenimento` },
          { label: data.title },
        ]} />

        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden mb-8">
          {backdropUrl && (
            <div className="absolute inset-0">
              <img src={backdropUrl} alt={data.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
            </div>
          )}
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6">
            {posterUrl && (
              <img src={posterUrl} alt={data.title} className="w-40 md:w-56 rounded-lg shadow-2xl flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="outline" className="bg-background/80">
                  {isMovie ? <><Film className="h-3 w-3 mr-1" /> Filme</> : <><Tv className="h-3 w-3 mr-1" /> Série</>}
                </Badge>
                {year && <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" />{year}</Badge>}
                {data.runtime && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(data.runtime / 60)}h {data.runtime % 60}min
                  </Badge>
                )}
                {data.vote_average > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    <Star className="h-3 w-3 fill-current mr-1" />
                    {data.vote_average.toFixed(1)}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold font-serif mb-2">{data.title}</h1>
              {data.tagline && <p className="text-muted-foreground italic mb-3">{data.tagline}</p>}
              <div className="flex flex-wrap gap-2 mb-4">
                {(data.genres || []).map((g: any) => (
                  <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sinopse */}
        {data.overview && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-3">Sinopse</h2>
            <p className="text-foreground/90 leading-relaxed">{data.overview}</p>
          </section>
        )}

        {/* Trailers */}
        {data.trailers && data.trailers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-3">Trailers</h2>
            {playingTrailer ? (
              <div className="aspect-video rounded-lg overflow-hidden mb-3">
                <iframe
                  src={`${getYouTubeEmbedUrl(playingTrailer)}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {data.trailers.map((t: any) => (
                <Button key={t.key} variant="outline" size="sm" onClick={() => setPlayingTrailer(t.key)}>
                  <Play className="h-4 w-4 mr-2" /> {t.name || "Trailer"}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Elenco */}
        {data.cast && data.cast.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Elenco
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {data.cast.map((person: CastMember) => (
                <Link key={person.id} to={`/pessoa/${person.id}`} className="group">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2">
                    {person.profile_path ? (
                      <img
                        src={getTMDBImageUrl(person.profile_path, "w300") || ""}
                        alt={person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Users className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">{person.name}</p>
                  {person.character && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Equipe (Direção) */}
        {data.crew && data.crew.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-4">Direção e Roteiro</h2>
            <div className="flex flex-wrap gap-3">
              {data.crew.map((person: CrewMember, idx: number) => (
                <Link key={`${person.id}-${idx}`} to={`/pessoa/${person.id}`}
                  className="flex items-center gap-2 bg-accent/50 hover:bg-accent rounded-lg px-3 py-2 transition-colors">
                  {person.profile_path && (
                    <img src={getTMDBImageUrl(person.profile_path, "w200") || ""} alt={person.name}
                      className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.job}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Onde assistir */}
        {data.watch_providers && (data.watch_providers.flatrate || data.watch_providers.rent) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-3 flex items-center gap-2">
              <ExternalLink className="h-5 w-5" /> Onde Assistir
            </h2>
            {["flatrate", "rent", "buy"].map((kind) => {
              const list = data.watch_providers[kind];
              if (!list?.length) return null;
              const labels: any = { flatrate: "Streaming", rent: "Alugar", buy: "Comprar" };
              return (
                <div key={kind} className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">{labels[kind]}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((p: any) => (
                      <div key={p.provider_id} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-1.5">
                        {p.logo_path && (
                          <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name}
                            className="w-6 h-6 rounded" />
                        )}
                        <span className="text-sm">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <RelatedNewsSection
          heading={`Notícias sobre ${data.title}`}
          articleIds={mentionIds.length > 0 ? mentionIds : undefined}
          searchTerm={mentionIds.length === 0 ? data.title : undefined}
        />
      </article>
    </>
  );
}
