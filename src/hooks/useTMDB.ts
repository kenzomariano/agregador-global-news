import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TMDBItem {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv" | "person";
  title: string;
  original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  vote_average: number | null;
  popularity: number | null;
  genre_ids: number[] | null;
  is_trending: boolean;
  trailers?: TMDBTrailer[];
}

export interface TMDBTrailer {
  id: string;
  tmdb_id: number;
  media_type: string;
  video_key: string;
  video_site: string;
  video_name: string | null;
  video_type: string | null;
  is_official: boolean;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getTMDBImageUrl(path: string | null, size: "w200" | "w300" | "w500" | "w780" | "original" = "w500"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getYouTubeEmbedUrl(key: string): string {
  return `https://www.youtube.com/embed/${key}`;
}

export function getYouTubeThumbnail(key: string): string {
  return `https://img.youtube.com/vi/${key}/hqdefault.jpg`;
}

export function useTrendingContent() {
  return useQuery({
    queryKey: ["tmdb-trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tmdb_cache")
        .select("*")
        .eq("is_trending", true)
        .order("popularity", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as TMDBItem[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTrendingTrailers() {
  return useQuery({
    queryKey: ["tmdb-trailers"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "get_trailers" },
      });

      if (error) throw error;
      return (data?.data || []) as TMDBItem[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useSyncTMDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "sync_trending" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tmdb-trending"] });
      queryClient.invalidateQueries({ queryKey: ["tmdb-trailers"] });
    },
  });
}

export function useSearchTMDB() {
  return useMutation({
    mutationFn: async ({ query, type = "multi" }: { query: string; type?: "movie" | "tv" | "multi" }) => {
      const { data, error } = await supabase.functions.invoke("tmdb-sync", {
        body: { action: "search", query, type },
      });

      if (error) throw error;
      return data?.data || [];
    },
  });
}