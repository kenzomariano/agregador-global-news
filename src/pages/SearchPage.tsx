import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "@/components/news/ArticleCard";
import { supabase } from "@/integrations/supabase/client";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";

const SEARCH_PER_PAGE = 12;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const categoryFilter = searchParams.get("categoria") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch(query, categoryFilter, page);
    }
  }, [query, categoryFilter]);

  const performSearch = async (q: string, cat: string) => {
    setLoading(true);
    setSearched(true);
    try {
      let dbQuery = supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .order("published_at", { ascending: false })
        .limit(30);

      if (cat) {
        dbQuery = dbQuery.eq("category", cat as CategoryKey);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;
      setResults((data as Article[]) || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim(), ...(categoryFilter ? { categoria: categoryFilter } : {}) });
    }
  };

  const toggleCategory = (key: string) => {
    const params: Record<string, string> = { q: query };
    if (categoryFilter !== key) params.categoria = key;
    setSearchParams(params);
  };

  return (
    <>
      <SEOHead
        title={query ? `Buscar: ${query}` : "Buscar Notícias"}
        description={`Busque notícias sobre ${query || "qualquer assunto"} no DESIGNE.`}
        keywords={["buscar", "pesquisar", "notícias", query].filter(Boolean) as string[]}
      />

      <div className="container max-w-4xl py-8 space-y-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: query ? `Buscar: ${query}` : "Buscar" },
        ]} />
        <h1 className="text-3xl font-bold font-serif">Buscar Notícias</h1>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="search"
            placeholder="Digite sua busca..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Buscar</span>
          </Button>
        </form>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <Badge
              key={key}
              variant={categoryFilter === key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleCategory(key)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : searched ? (
          results.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {results.length} resultado{results.length !== 1 ? "s" : ""} para "<strong>{query}</strong>"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhum resultado encontrado para "<strong>{query}</strong>"</p>
              <p className="text-sm mt-2">Tente termos diferentes ou remova os filtros.</p>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Digite algo para buscar notícias.</p>
          </div>
        )}
      </div>
    </>
  );
}
