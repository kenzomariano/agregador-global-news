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

export function useArticles(category?: CategoryKey, limit = 20) {
  return useQuery({
    queryKey: ["articles", category, limit],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .order("published_at", { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
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

export function useTrendingArticles(limit = 10) {
  return useQuery({
    queryKey: ["trending-articles", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .order("views_count", { ascending: false })
        .limit(limit);

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
