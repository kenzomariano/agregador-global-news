import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  };
}

// Columns the anon role is allowed to read (matches GRANT in migration 20260623182637).
const ANON_COMMENT_COLUMNS = "id, article_id, content, created_at, updated_at";
// Authenticated readers additionally need user_id to render the "delete my own" affordance.
const AUTH_COMMENT_COLUMNS = `${ANON_COMMENT_COLUMNS}, user_id`;

export function useArticleComments(articleId: string) {
  const { user } = useAuth();
  const isAuthed = !!user;

  return useQuery({
    // Bucket cache by auth state so anon payloads (no user_id) never leak into the authed view.
    queryKey: ["article-comments", articleId, isAuthed ? "auth" : "anon"],
    queryFn: async () => {
      const columns = isAuthed ? AUTH_COMMENT_COLUMNS : ANON_COMMENT_COLUMNS;
      const { data, error } = await supabase
        .from("article_comments")
        .select(columns)
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

export const __test__ = { ANON_COMMENT_COLUMNS, AUTH_COMMENT_COLUMNS };
