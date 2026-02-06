import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  };
}

export function useArticleComments(articleId: string) {
  return useQuery({
    queryKey: ["article-comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ArticleComment[];
    },
    enabled: !!articleId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, userId, content }: { articleId: string; userId: string; content: string }) => {
      const { data, error } = await supabase
        .from("article_comments")
        .insert({ article_id: articleId, user_id: userId, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["article-comments", variables.articleId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, articleId }: { commentId: string; articleId: string }) => {
      const { error } = await supabase
        .from("article_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["article-comments", variables.articleId] });
    },
  });
}
