import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  original_url: string;
  category: string | null;
  is_available: boolean | null;
  source_id: string | null;
  scraped_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  news_sources?: {
    name: string;
    logo_url: string | null;
  } | null;
}

export function useProducts(limit = 100) {
  return useQuery({
    queryKey: ["products", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, news_sources(name, logo_url)")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, news_sources(name, logo_url)")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!slug,
  });
}
