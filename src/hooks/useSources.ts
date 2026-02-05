import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  is_foreign: boolean;
  source_type: string;
  sitemap_url: string | null;
  scrape_limit: number;
  created_at: string;
  updated_at: string;
}

export function useSources() {
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
