import { useState, useMemo } from "react";
import { Film, Tv, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTMDBImageUrl, type TMDBItem } from "@/hooks/useTMDB";
import { MovieDetailModal } from "@/components/entertainment/MovieDetailModal";

interface TMDBMentionProps {
  item: TMDBItem;
}

export function TMDBMention({ item }: TMDBMentionProps) {
  const [showModal, setShowModal] = useState(false);
  const posterUrl = getTMDBImageUrl(item.poster_path, "w200");
  const year = item.release_date ? new Date(item.release_date).getFullYear() : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 bg-accent/50 hover:bg-accent rounded-lg px-3 py-2 transition-colors my-2"
      >
        {posterUrl && (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-10 h-14 object-cover rounded"
          />
        )}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{item.title}</span>
            {item.vote_average && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-0.5" />
                {item.vote_average.toFixed(1)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.media_type === "movie" ? (
              <span className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                Filme
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Tv className="h-3 w-3" />
                Série
              </span>
            )}
            {year && <span>{year}</span>}
          </div>
        </div>
      </button>

      <MovieDetailModal
        item={item}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}

interface TMDBMentionsProps {
  mentions: TMDBItem[];
}

export function TMDBMentions({ mentions }: TMDBMentionsProps) {
  if (!mentions || mentions.length === 0) return null;

  return (
    <div className="my-6 p-4 bg-accent/30 rounded-lg">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        Filmes e Séries Mencionados
      </h4>
      <div className="flex flex-wrap gap-2">
        {mentions.map((item) => (
          <TMDBMention key={item.tmdb_id} item={item} />
        ))}
      </div>
    </div>
  );
}
