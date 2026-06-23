import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Exported for regression tests — anon may only SELECT (id, article_id, created_at),
// so the count query must request an allowed column instead of "*".
export async function fetchArticleLikesCount(articleId: string): Promise<number> {
  const { count, error } = await supabase
    .from("article_likes")
    .select("id", { count: "exact", head: true })
    .eq("article_id", articleId);
  if (error) throw error;
  return count || 0;
}

export function useArticleLikes(articleId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: likesCount = 0 } = useQuery({
    queryKey: ["article-likes-count", articleId],
    queryFn: () => fetchArticleLikesCount(articleId),
    enabled: !!articleId,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ["article-liked", articleId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("article_likes")
        .select("id")
        .eq("article_id", articleId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!articleId && !!user,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login necessário");
      if (isLiked) {
        const { error } = await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("article_likes")
          .insert({ article_id: articleId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-likes-count", articleId] });
      queryClient.invalidateQueries({ queryKey: ["article-liked", articleId] });
    },
  });

  return { likesCount, isLiked, toggleLike };
}
