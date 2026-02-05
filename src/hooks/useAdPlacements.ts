import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdPlacement {
  id: string;
  name: string;
  slot_id: string;
  position: string;
  ad_type: string;
  banner_url: string | null;
  banner_link: string | null;
  banner_image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAdPlacements() {
  return useQuery({
    queryKey: ["ad-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_placements")
        .select("*")
        .order("position");

      if (error) throw error;
      return data as AdPlacement[];
    },
  });
}

export function useActiveAds(position?: string) {
  return useQuery({
    queryKey: ["active-ads", position],
    queryFn: async () => {
      let query = supabase
        .from("ad_placements")
        .select("*")
        .eq("is_active", true);

      if (position) {
        query = query.eq("position", position);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdPlacement[];
    },
  });
}

export function useCreateAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placement: Omit<AdPlacement, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("ad_placements")
        .insert(placement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      queryClient.invalidateQueries({ queryKey: ["active-ads"] });
    },
  });
}

export function useUpdateAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdPlacement> & { id: string }) => {
      const { data, error } = await supabase
        .from("ad_placements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      queryClient.invalidateQueries({ queryKey: ["active-ads"] });
    },
  });
}

export function useDeleteAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ad_placements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      queryClient.invalidateQueries({ queryKey: ["active-ads"] });
    },
  });
}
