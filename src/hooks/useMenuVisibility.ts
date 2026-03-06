import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCategoriesWithArticles() {
  return useQuery({
    queryKey: ["categories-with-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("category");

      if (error) throw error;

      const categories = new Set(data?.map((a) => a.category) || []);
      return categories;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useHasProducts() {
  return useQuery({
    queryKey: ["has-products"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_available", true)
        .limit(1);

      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}
