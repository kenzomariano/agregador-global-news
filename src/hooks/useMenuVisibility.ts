import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCategoriesWithArticles() {
  return useQuery({
    queryKey: ["categories-with-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("category")
        .eq("status", "published");

      if (error) throw error;

      const categories = new Set(data?.map((a) => a.category) || []);
      return categories;
    },
    staleTime: 5 * 60 * 1000,
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

export function useHasGuides() {
  return useQuery({
    queryKey: ["has-guides"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("guides")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .limit(1);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface CustomMenuLink {
  label: string;
  url: string;
  emoji?: string;
}

export interface MenuConfig {
  showProducts: boolean;
  showGuides: boolean;
  showTrending: boolean;
  customLinks: CustomMenuLink[];
  hiddenCategories: string[];
}

const DEFAULT_MENU_CONFIG: MenuConfig = {
  showProducts: true,
  showGuides: true,
  showTrending: true,
  customLinks: [],
  hiddenCategories: [],
};

export function useMenuConfig() {
  return useQuery({
    queryKey: ["menu-config"],
    queryFn: async (): Promise<MenuConfig> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "menu_config")
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return DEFAULT_MENU_CONFIG;
      try {
        return { ...DEFAULT_MENU_CONFIG, ...JSON.parse(data.value) };
      } catch {
        return DEFAULT_MENU_CONFIG;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
