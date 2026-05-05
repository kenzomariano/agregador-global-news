import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, Film } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { supabase } from "@/integrations/supabase/client";
import { getTMDBImageUrl } from "@/hooks/useTMDB";
import { useQuery } from "@tanstack/react-query";

export default function PersonPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["tmdb-person", tmdbId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "get_person", tmdb_id: Number(tmdbId) },
      });
      if (error) throw error;
      return data?.data;
    },
    enabled: !!tmdbId,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["person-articles", tmdbId, data?.name],
    queryFn: async () => {
      if (!data?.name) return [];
      const { data: arts } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("status", "published")
        .or(`title.ilike.%${data.name}%,content.ilike.%${data.name}%`)
        .order("published_at", { ascending: false })
        .limit(12);
      return arts || [];
    },
    enabled: !!data?.name,
  });

  if (isLoading || !data) {
    return (
      <div className="container py-8 max-w-5xl">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const profileUrl = getTMDBImageUrl(data.profile_path, "w500");

  return (
    <>
      <SEOHead
        title={`${data.name} - Biografia, Filmografia e Notícias`}
        description={data.biography?.slice(0, 160) || `Tudo sobre ${data.name}: biografia, filmografia e últimas notícias.`}
        image={profileUrl || undefined}
        type="article"
      />

      <article className="container py-6 max-w-5xl">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Pessoas" },
          { label: data.name },
        ]} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1">
            {profileUrl ? (
              <img src={profileUrl} alt={data.name} className="w-full rounded-lg shadow-lg" />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg" />
            )}
          </div>
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">{data.name}</h1>
            {data.known_for_department && (
              <p className="text-muted-foreground mb-4">{data.known_for_department}</p>
            )}
            <div className="space-y-2 text-sm mb-4">
              {data.birthday && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Nascimento: {new Date(data.birthday).toLocaleDateString("pt-BR")}
                  {data.deathday && ` — Falecimento: ${new Date(data.deathday).toLocaleDateString("pt-BR")}`}
                </p>
              )}
              {data.place_of_birth && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {data.place_of_birth}
                </p>
              )}
            </div>
            {data.biography && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Biografia</h2>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{data.biography}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filmografia */}
        {data.cast && data.cast.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" /> Filmografia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.cast
                .filter((c: any) => c.media_type === "movie" || c.media_type === "tv")
                .map((c: any, idx: number) => (
                <Link key={`${c.tmdb_id}-${idx}`} to={`/titulo/${c.media_type}/${c.tmdb_id}`} className="group">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2">
                    {c.poster_path ? (
                      <img src={getTMDBImageUrl(c.poster_path, "w300") || ""} alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Film className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-xs group-hover:text-primary transition-colors line-clamp-2">{c.title}</p>
                  {c.character && <p className="text-xs text-muted-foreground line-clamp-1">{c.character}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Notícias */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold font-serif mb-4">Notícias sobre {data.name}</h2>
          {relatedArticles && relatedArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.map((a: any) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma notícia encontrada sobre esta pessoa ainda.
            </CardContent></Card>
          )}
        </section>
      </article>
    </>
  );
}
