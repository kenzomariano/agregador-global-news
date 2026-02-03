import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleTag {
  id: string;
  article_id: string;
  tag: string;
  created_at: string;
}

export function useArticleTags(articleId: string | undefined) {
  return useQuery({
    queryKey: ["article-tags", articleId],
    queryFn: async () => {
      if (!articleId) return [];
      
      const { data, error } = await supabase
        .from("article_tags")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ArticleTag[];
    },
    enabled: !!articleId,
  });
}

export function usePopularTags(limit = 20) {
  return useQuery({
    queryKey: ["popular-tags", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_tags")
        .select("tag")
        .limit(500);

      if (error) throw error;
      
      // Count tag occurrences
      const tagCounts = (data || []).reduce((acc, { tag }) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Sort by count and return top tags
      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    },
  });
}

export function useArticlesByTag(tag: string) {
  return useQuery({
    queryKey: ["articles-by-tag", tag],
    queryFn: async () => {
      const { data: tagData, error: tagError } = await supabase
        .from("article_tags")
        .select("article_id")
        .eq("tag", tag);

      if (tagError) throw tagError;

      const articleIds = tagData?.map((t) => t.article_id).filter(Boolean) as string[];
      
      if (articleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .in("id", articleIds)
        .order("published_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!tag,
  });
}
