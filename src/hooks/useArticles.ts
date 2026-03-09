import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryKey } from "@/lib/categories";

export interface Article {
  id: string;
  source_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  original_url: string;
  category: CategoryKey;
  views_count: number;
  is_featured: boolean;
  is_translated: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  news_sources?: {
    name: string;
    logo_url: string | null;
  };
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  logo_url: string | null;
  is_foreign: boolean;
  is_active: boolean;
  source_type: "article" | "product";
  sitemap_url: string | null;
  created_at: string;
}

export function useArticles(category?: CategoryKey, limit = 20, page = 1) {
  return useQuery({
    queryKey: ["articles", category, limit, page],
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)", { count: "exact" })
        .order("published_at", { ascending: false })
        .range(from, to);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { articles: data as Article[], total: count || 0 };
    },
  });
}

export function useFeaturedArticles(limit = 5) {
  return useQuery({
    queryKey: ["featured-articles", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("is_featured", true)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Article[];
    },
  });
}

export type TrendingPeriod = "today" | "week" | "month" | "all";

export function useTrendingArticles(limit = 10, period: TrendingPeriod = "all") {
  return useQuery({
    queryKey: ["trending-articles", limit, period],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .order("views_count", { ascending: false })
        .limit(limit);

      if (period !== "all") {
        const now = new Date();
        let since: Date;
        if (period === "today") {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === "week") {
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        query = query.gte("published_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
    },
  });
}

export function useArticleBySlug(slug: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as Article | null;
    },
    enabled: !!slug,
  });
}

export function useRelatedArticles(articleId: string, category: CategoryKey, limit = 5) {
  return useQuery({
    queryKey: ["related-articles", articleId, category, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("category", category)
        .neq("id", articleId)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Article[];
    },
    enabled: !!articleId && !!category,
  });
}

export function useNewsSources() {
  return useQuery({
    queryKey: ["news-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_sources")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as NewsSource[];
    },
  });
}

export function useIncrementViews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase.rpc("increment_article_views", {
        article_id: articleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    },
  });
}
