import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSavedArticles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const savedArticlesQuery = useQuery({
    queryKey: ["saved-articles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_articles")
        .select("*, articles(*, news_sources(name))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return savedArticlesQuery;
}

export function useIsSaved(articleId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-saved", articleId, user?.id],
    enabled: !!user && !!articleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_articles")
        .select("id")
        .eq("user_id", user!.id)
        .eq("article_id", articleId)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useToggleSave(articleId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("saved_articles")
        .select("id")
        .eq("user_id", user.id)
        .eq("article_id", articleId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("saved_articles")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from("saved_articles")
          .insert({ user_id: user.id, article_id: articleId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-saved", articleId] });
      queryClient.invalidateQueries({ queryKey: ["saved-articles"] });
    },
  });
}
