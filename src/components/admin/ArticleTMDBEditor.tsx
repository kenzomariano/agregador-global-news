import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Tv, Star, Search, X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ArticleTMDBEditorProps {
  articleId: string;
}

interface SavedMention {
  id: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  vote_average: number | null;
}

export function ArticleTMDBEditor({ articleId }: ArticleTMDBEditorProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["article-tmdb-mentions", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_tmdb_mentions")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at");
      if (error) throw error;
      return data as SavedMention[];
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "search", query: searchQuery, type: "multi" },
      });
      if (error) throw error;
      const results = (data?.data || []).filter(
        (r: any) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
      );
      setSearchResults(results.slice(0, 8));
    } catch {
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (item: any) => {
    try {
      const { error } = await supabase.from("article_tmdb_mentions").insert({
        article_id: articleId,
        tmdb_id: item.id,
        media_type: item.media_type,
        title: item.title || item.name,
        original_title: item.original_title || item.original_name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date || null,
        vote_average: item.vote_average,
        popularity: item.popularity,
        genre_ids: item.genre_ids,
      });
      if (error) throw error;
      toast({ title: "Título adicionado!" });
      queryClient.invalidateQueries({ queryKey: ["article-tmdb-mentions", articleId] });
      setSearchResults((prev) => prev.filter((r) => r.id !== item.id));
    } catch (err: any) {
      toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from("article_tmdb_mentions").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["article-tmdb-mentions", articleId] });
      toast({ title: "Removido!" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Film className="h-4 w-4" />
        Filmes e Séries Mencionados
      </Label>

      {/* Current mentions */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentions.map((m) => (
            <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
              {m.media_type === "movie" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
              {m.title}
              {m.vote_average && (
                <span className="text-xs opacity-70">
                  <Star className="h-2.5 w-2.5 inline fill-yellow-500 text-yellow-500 ml-1" />
                  {Number(m.vote_average).toFixed(1)}
                </span>
              )}
              <button
                onClick={() => handleRemove(m.id)}
                className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar filme ou série..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={handleSearch} disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border rounded-md p-2">
          {searchResults.map((item) => {
            const alreadyAdded = mentions.some((m) => m.tmdb_id === item.id);
            return (
              <button
                key={item.id}
                disabled={alreadyAdded}
                onClick={() => handleAdd(item)}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-accent text-left text-sm disabled:opacity-40"
              >
                <Plus className="h-3 w-3 shrink-0" />
                {item.media_type === "movie" ? <Film className="h-3 w-3 shrink-0" /> : <Tv className="h-3 w-3 shrink-0" />}
                <span className="truncate">{item.title || item.name}</span>
                {item.release_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({new Date(item.release_date || item.first_air_date).getFullYear()})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
