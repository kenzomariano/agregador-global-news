import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AffiliateProduct {
  name: string;
  description: string;
  price: number;
  sale_price: number;
  discount_percent: number;
  store: "mercadolivre" | "shopee";
  category: string;
  affiliate_url: string;
  image_keyword: string;
}

export function useAffiliateProducts(category = "ofertas", limit = 6) {
  return useQuery({
    queryKey: ["affiliate-products", category, limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-affiliate-products", {
        body: { category, limit },
      });

      if (error) throw error;
      return (data?.products || []) as AffiliateProduct[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: 1,
  });
}
