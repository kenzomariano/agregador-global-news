import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GuideStep {
  title: string;
  description: string;
}

export interface Guide {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  steps: GuideStep[];
  is_published: boolean;
  author_name: string;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGuides(publishedOnly = true) {
  return useQuery({
    queryKey: ["guides", publishedOnly],
    queryFn: async () => {
      let query = supabase
        .from("guides")
        .select("*")
        .order("published_at", { ascending: false });

      if (publishedOnly) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as any[]).map((g) => ({
        ...g,
        steps: Array.isArray(g.steps) ? g.steps : [],
      })) as Guide[];
    },
  });
}

export function useGuideBySlug(slug: string) {
  return useQuery({
    queryKey: ["guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        steps: Array.isArray(data.steps) ? data.steps : [],
      } as unknown as Guide;
    },
    enabled: !!slug,
  });
}

export function useCreateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guide: Partial<Guide>) => {
      const { data, error } = await supabase
        .from("guides")
        .insert(guide as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guides"] }),
  });
}

export function useUpdateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Guide> & { id: string }) => {
      const { data, error } = await supabase
        .from("guides")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guides"] }),
  });
}

export function useDeleteGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guides"] }),
  });
}
