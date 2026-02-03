import { useState, useEffect } from "react";
import { Film, Tv, Star, Calendar, Clock, ExternalLink, Play, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { getTMDBImageUrl, getYouTubeEmbedUrl, type TMDBItem, type TMDBTrailer } from "@/hooks/useTMDB";

interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface WatchProviders {
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  link?: string;
}

interface MovieDetails extends TMDBItem {
  runtime?: number | null;
  genres?: { id: number; name: string }[] | null;
  tagline?: string | null;
  watch_providers?: WatchProviders | null;
}

interface MovieDetailModalProps {
  item: TMDBItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovieDetailModal({ item, open, onOpenChange }: MovieDetailModalProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [trailers, setTrailers] = useState<TMDBTrailer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingTrailer, setPlayingTrailer] = useState<string | null>(null);

  useEffect(() => {
    if (item && open) {
      fetchDetails();
    } else {
      setDetails(null);
      setTrailers([]);
      setPlayingTrailer(null);
    }
  }, [item, open]);

  const fetchDetails = async () => {
    if (!item) return;
    
    setIsLoading(true);
    try {
      console.log("Fetching details for:", item.tmdb_id, item.media_type);
      
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { 
          action: "get_details", 
          tmdb_id: item.tmdb_id, 
          media_type: item.media_type 
        },
      });

      console.log("TMDB response:", data, error);

      if (!error && data?.data) {
        setDetails(data.data);
        setTrailers(data.trailers || []);
        console.log("Watch providers:", data.data.watch_providers);
      }
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  const backdropUrl = getTMDBImageUrl(item.backdrop_path, "w780");
  const posterUrl = getTMDBImageUrl(item.poster_path, "w300");
  const year = item.release_date ? new Date(item.release_date).getFullYear() : null;

  const renderProviders = (providers: StreamingProvider[] | undefined, title: string) => {
    if (!providers || providers.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <div
              key={provider.provider_id}
              className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-1.5"
              title={provider.provider_name}
            >
              {provider.logo_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                  alt={provider.provider_name}
                  className="w-6 h-6 rounded"
                />
              )}
              <span className="text-sm">{provider.provider_name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {playingTrailer ? (
          <div className="relative aspect-video">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70"
              onClick={() => setPlayingTrailer(null)}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
            <iframe
              src={`${getYouTubeEmbedUrl(playingTrailer)}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <ScrollArea className="max-h-[90vh]">
            {/* Backdrop */}
            <div className="relative h-48 md:h-64 overflow-hidden">
              {backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              
              {/* Poster overlay */}
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <div className="w-28 md:w-36 aspect-[2/3] rounded-lg overflow-hidden shadow-xl border-4 border-background">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      {item.media_type === "movie" ? (
                        <Film className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <Tv className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-20 md:pt-24 px-6 pb-6">
              <DialogHeader className="text-left mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold font-serif">
                      {item.title}
                    </DialogTitle>
                    {details?.tagline && (
                      <p className="text-muted-foreground italic mt-1">
                        {details.tagline}
                      </p>
                    )}
                  </div>
                  {item.vote_average && (
                    <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-lg px-3 py-1">
                      <Star className="h-4 w-4 fill-current mr-1" />
                      {item.vote_average.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="outline">
                  {item.media_type === "movie" ? (
                    <>
                      <Film className="h-3 w-3 mr-1" />
                      Filme
                    </>
                  ) : (
                    <>
                      <Tv className="h-3 w-3 mr-1" />
                      Série
                    </>
                  )}
                </Badge>
                {year && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {year}
                  </Badge>
                )}
                {details?.runtime && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(details.runtime / 60)}h {details.runtime % 60}min
                  </Badge>
                )}
              </div>

              {/* Genres */}
              {details?.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {details.genres.map((genre) => (
                    <Badge key={genre.id} variant="outline" className="text-xs">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Overview */}
              {isLoading ? (
                <div className="space-y-2 mb-6">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p className="text-foreground/90 leading-relaxed mb-6">
                  {details?.overview || item.overview || "Sinopse não disponível."}
                </p>
              )}

              {/* Trailers */}
              {trailers.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Trailers</h3>
                    <div className="flex flex-wrap gap-3">
                      {trailers.slice(0, 3).map((trailer) => (
                        <Button
                          key={trailer.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setPlayingTrailer(trailer.video_key)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {trailer.video_name || "Trailer"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Streaming Providers */}
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                    ))}
                  </div>
                </div>
              ) : details?.watch_providers ? (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Onde Assistir
                    </h3>
                    
                    {renderProviders(details.watch_providers.flatrate, "Streaming")}
                    {renderProviders(details.watch_providers.rent, "Alugar")}
                    {renderProviders(details.watch_providers.buy, "Comprar")}

                    {!details.watch_providers.flatrate?.length && 
                     !details.watch_providers.rent?.length && 
                     !details.watch_providers.buy?.length && (
                      <p className="text-muted-foreground text-sm">
                        Informações de streaming não disponíveis para sua região.
                      </p>
                    )}

                    {details.watch_providers.link && (
                      <Button asChild variant="link" size="sm" className="p-0 mt-2">
                        <a
                          href={details.watch_providers.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver mais opções no TMDB
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
