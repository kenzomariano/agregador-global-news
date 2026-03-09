import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleFaq {
  id: string;
  article_id: string;
  question: string;
  answer: string;
  position: number;
  created_at: string;
}

export function useArticleFaqs(articleId: string | undefined) {
  return useQuery({
    queryKey: ["article-faqs", articleId],
    queryFn: async () => {
      if (!articleId) return [];
      
      const { data, error } = await supabase
        .from("article_faqs")
        .select("*")
        .eq("article_id", articleId)
        .order("position", { ascending: true });
      
      if (error) throw error;
      return data as ArticleFaq[];
    },
    enabled: !!articleId,
  });
}

export function useGenerateArticleFaqs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-article-faq", {
        body: { articleId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, articleId) => {
      queryClient.invalidateQueries({ queryKey: ["article-faqs", articleId] });
    },
  });
}
