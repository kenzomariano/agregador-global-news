import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/hooks/useArticles";

export function useNextArticles(publishedAt: string | null | undefined, excludeIds: string[], limit = 1) {
  return useQuery({
    queryKey: ["next-articles", publishedAt, excludeIds, limit],
    queryFn: async () => {
      if (!publishedAt) return [];

      let query = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("status", "published")
        .lt("published_at", publishedAt)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (excludeIds.length > 0) {
        // Use not.in to exclude already loaded articles
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!publishedAt,
  });
}
