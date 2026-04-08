import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/hooks/useArticles";

export function useAdjacentArticles(publishedAt: string | null | undefined, articleId: string | undefined) {
  return useQuery({
    queryKey: ["adjacent-articles", articleId],
    queryFn: async () => {
      if (!publishedAt || !articleId) return { prev: null, next: null };

      const [prevRes, nextRes] = await Promise.all([
        supabase
          .from("articles")
          .select("slug, title, image_url, category")
          .eq("status", "published")
          .lt("published_at", publishedAt)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("articles")
          .select("slug, title, image_url, category")
          .eq("status", "published")
          .gt("published_at", publishedAt)
          .order("published_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        prev: prevRes.data as Pick<Article, "slug" | "title" | "image_url" | "category"> | null,
        next: nextRes.data as Pick<Article, "slug" | "title" | "image_url" | "category"> | null,
      };
    },
    enabled: !!publishedAt && !!articleId,
  });
}
