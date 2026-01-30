import { Link } from "react-router-dom";
import { Film, Tv, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTrendingContent, getTMDBImageUrl, type TMDBItem } from "@/hooks/useTMDB";

export function TrendingMovies() {
  const { data: items, isLoading } = useTrendingContent();

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-36 h-56 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const movies = items.filter((item) => item.media_type === "movie");
  const tvShows = items.filter((item) => item.media_type === "tv");

  return (
    <section className="py-6 space-y-8">
      {movies.length > 0 && (
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <Film className="h-5 w-5" />
            Filmes em Alta
          </h2>
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {movies.map((item) => (
                <MovieCard key={item.id} item={item} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {tvShows.length > 0 && (
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <Tv className="h-5 w-5" />
            Séries em Alta
          </h2>
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {tvShows.map((item) => (
                <MovieCard key={item.id} item={item} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </section>
  );
}

function MovieCard({ item }: { item: TMDBItem }) {
  const posterUrl = getTMDBImageUrl(item.poster_path, "w300");
  const year = item.release_date ? new Date(item.release_date).getFullYear() : null;

  return (
    <Card className="w-36 flex-shrink-0 overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="relative aspect-[2/3] overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {item.media_type === "movie" ? (
              <Film className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Tv className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          {item.vote_average && (
            <Badge className="bg-black/70 text-white text-xs">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-1" />
              {item.vote_average.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {year && (
          <p className="text-xs text-muted-foreground mt-1">{year}</p>
        )}
      </CardContent>
    </Card>
  );
}