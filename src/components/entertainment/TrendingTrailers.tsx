import { useState } from "react";
import { Play, Film, Tv, Star, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  useTrendingTrailers,
  useSyncTMDB,
  getTMDBImageUrl,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  type TMDBItem,
} from "@/hooks/useTMDB";

export function TrendingTrailers() {
  const { data: items, isLoading } = useTrendingTrailers();
  const syncMutation = useSyncTMDB();
  const [selectedTrailer, setSelectedTrailer] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-24 h-14 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const itemsWithTrailers = items?.filter((item) => item.trailers && item.trailers.length > 0) || [];

  if (itemsWithTrailers.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5 text-primary" />
            Trailers em Alta
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum trailer disponível. Clique no botão de sincronizar para buscar os trailers mais recentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="h-5 w-5 text-primary" />
          Trailers em Alta
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {itemsWithTrailers.slice(0, 5).map((item) => (
          <TrailerItem
            key={item.id}
            item={item}
            onPlay={(key) => setSelectedTrailer(key)}
          />
        ))}
      </CardContent>

      <Dialog open={!!selectedTrailer} onOpenChange={() => setSelectedTrailer(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedTrailer && (
            <div className="aspect-video">
              <iframe
                src={`${getYouTubeEmbedUrl(selectedTrailer)}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TrailerItem({
  item,
  onPlay,
}: {
  item: TMDBItem;
  onPlay: (key: string) => void;
}) {
  const trailer = item.trailers?.[0];
  if (!trailer) return null;

  const thumbnailUrl = getYouTubeThumbnail(trailer.video_key);

  return (
    <button
      onClick={() => onPlay(trailer.video_key)}
      className="flex gap-3 w-full text-left hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors group"
    >
      <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
        <img
          src={thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
          <Play className="h-6 w-6 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
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
          {item.vote_average && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              {item.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}