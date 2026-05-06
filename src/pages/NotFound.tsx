import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Search, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/seo/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleCard } from "@/components/news/ArticleCard";
import { supabase } from "@/integrations/supabase/client";

function extractTerms(pathname: string): string[] {
  const stop = new Set(["noticia", "noticias", "categoria", "tag", "produto", "produtos", "titulo", "pessoa", "guia", "guias", "buscar"]);
  const slug = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .pop() || "";
  return slug
    .split("-")
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !/^\d+$/.test(w) && !stop.has(w.toLowerCase()))
    .slice(0, 6);
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const terms = useMemo(() => extractTerms(location.pathname), [location.pathname]);
  const guess = terms.join(" ");

  // Try to find a redirect first
  useEffect(() => {
    const slug = location.pathname.replace(/^\/+|\/+$/g, "").split("/").pop();
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("article_redirects")
        .select("new_slug")
        .eq("old_slug", slug)
        .maybeSingle();
      if (data?.new_slug) navigate(`/noticia/${data.new_slug}`, { replace: true });
    })();
  }, [location.pathname, navigate]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["404-suggestions", guess],
    queryFn: async () => {
      if (!guess) {
        const { data } = await supabase
          .from("articles")
          .select("*, news_sources(name, logo_url)")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(6);
        return data || [];
      }
      const filters = terms.map((t) => `title.ilike.%${t}%,excerpt.ilike.%${t}%`).join(",");
      const { data } = await supabase
        .from("articles")
        .select("*, news_sources(name, logo_url)")
        .eq("status", "published")
        .or(filters)
        .order("published_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim() || guess;
    if (q) navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <SEOHead
        title="Página não encontrada (404)"
        description="A página que você procura não existe. Veja outras notícias relacionadas ou faça uma busca."
      />
      <div className="container max-w-3xl py-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl md:text-7xl font-bold font-serif text-primary mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-1">Página não encontrada</p>
          <p className="text-sm text-muted-foreground break-all">
            <code className="bg-muted px-1 rounded">{location.pathname}</code>
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={guess ? `Buscar "${guess}"...` : "Buscar notícias..."}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button type="submit">Buscar</Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/"><Home className="h-4 w-4 mr-1.5" /> Início</Link>
              </Button>
            </form>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xl font-bold font-serif mb-4">
            {guess ? `Talvez você queira ler sobre "${guess}"` : "Notícias mais recentes"}
          </h2>
          {suggestions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestions.map((a: any) => (
                <ArticleCard key={a.id} article={a} variant="horizontal" />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">Nenhuma sugestão encontrada.</p>
          )}
        </section>
      </div>
    </>
  );
};

export default NotFound;
