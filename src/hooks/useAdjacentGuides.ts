import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdjacentGuides(publishedAt: string | null | undefined, guideId: string | undefined) {
  return useQuery({
    queryKey: ["adjacent-guides", guideId],
    queryFn: async () => {
      if (!publishedAt || !guideId) return { prev: null, next: null };
      const [prevRes, nextRes] = await Promise.all([
        supabase
          .from("guides")
          .select("slug, title, image_url")
          .eq("is_published", true)
          .lt("published_at", publishedAt)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("guides")
          .select("slug, title, image_url")
          .eq("is_published", true)
          .gt("published_at", publishedAt)
          .order("published_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        prev: prevRes.data as { slug: string; title: string; image_url: string | null } | null,
        next: nextRes.data as { slug: string; title: string; image_url: string | null } | null,
      };
    },
    enabled: !!publishedAt && !!guideId,
  });
}
