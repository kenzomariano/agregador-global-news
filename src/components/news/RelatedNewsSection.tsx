import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArticleCard } from "@/components/news/ArticleCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";

const PAGE_SIZE = 9;

interface RelatedNewsSectionProps {
  /** Title rendered above the news block. */
  heading: string;
  /** Either provide articleIds (preferred when curated) or a fallback search term. */
  articleIds?: string[];
  searchTerm?: string;
}

type SortOption = "recent" | "oldest" | "views";

export function RelatedNewsSection({
  heading,
  articleIds,
  searchTerm,
}: RelatedNewsSectionProps) {
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [page, setPage] = useState(1);

  const queryKey = ["related-news", articleIds?.join(",") || "", searchTerm || ""];

  const { data: articles = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Article[]> => {
      let q = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("status", "published")
        .limit(200);

      if (articleIds && articleIds.length > 0) {
        q = q.in("id", articleIds);
      } else if (searchTerm) {
        q = q.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      } else {
        return [];
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = useMemo(() => {
    let list = articles;
    if (category !== "all") list = list.filter((a) => a.category === category);
    list = [...list].sort((a, b) => {
      if (sort === "views") return (b.views_count || 0) - (a.views_count || 0);
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return sort === "recent" ? tb - ta : ta - tb;
    });
    return list;
  }, [articles, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, [articles]);

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold font-serif">{heading}</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {availableCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIES[c as CategoryKey]?.label || c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigas</SelectItem>
              <SelectItem value="views">Mais vistas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : paged.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma notícia encontrada com esses filtros.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
