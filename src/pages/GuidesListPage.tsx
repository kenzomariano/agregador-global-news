import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuides } from "@/hooks/useGuides";
import { useGuidesMenuConfig, useGuideCategoryCounts } from "@/hooks/useMenuVisibility";
import { DEFAULT_GUIDE_CATEGORIES } from "@/components/admin/GuidesMenuBuilder";
import { BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function GuidesListPage() {
  const { data: guides, isLoading } = useGuides(true);
  const { data: menuCfg } = useGuidesMenuConfig();
  const { data: counts } = useGuideCategoryCounts();
  const [params, setParams] = useSearchParams();
  const activeCat = params.get("cat") || "todos";

  const visibleCategories = useMemo(() => {
    const cfg = menuCfg ?? { showCategoriesSidebar: true, hideEmptyCategories: true, hiddenCategories: [], customLinks: [] };
    return DEFAULT_GUIDE_CATEGORIES.filter((c) => {
      if (cfg.hiddenCategories.includes(c.key)) return false;
      if (cfg.hideEmptyCategories && !(counts?.[c.key] ?? 0)) return false;
      return true;
    });
  }, [menuCfg, counts]);

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    if (activeCat === "todos") return guides;
    return guides.filter((g) => g.category === activeCat);
  }, [guides, activeCat]);

  const setCat = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === "todos") next.delete("cat"); else next.set("cat", key);
    setParams(next, { replace: true });
  };

  const showSidebar = (menuCfg?.showCategoriesSidebar ?? true) && visibleCategories.length > 0;

  return (
    <>
      <SEOHead
        title="Guias e Tutoriais"
        description="Guias completos e tutoriais do DESIGNE. Aprenda com passo a passo detalhado sobre tecnologia, economia, saúde, receitas e mais."
        keywords={["guias", "tutoriais", "como fazer", "passo a passo"]}
      />

      <div className="container py-6">
        <StructuredBreadcrumb items={[{ label: "Início", href: "/" }, { label: "Guias" }]} />

        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Guias e Tutoriais
          </h1>
          <p className="text-muted-foreground mt-2">Conteúdo editorial detalhado com passo a passo</p>
        </header>

        <div className={cn("grid gap-8", showSidebar && "lg:grid-cols-[220px_1fr]")}>
          {showSidebar && (
            <aside className="space-y-4">
              <div className="rounded-lg border bg-card p-3">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">Categorias</h2>
                <nav className="flex flex-col gap-1">
                  <button
                    onClick={() => setCat("todos")}
                    className={cn(
                      "text-sm text-left px-2 py-1.5 rounded hover:bg-accent flex items-center justify-between",
                      activeCat === "todos" && "bg-accent font-medium"
                    )}
                  >
                    <span>📚 Todos</span>
                    <span className="text-xs text-muted-foreground">{guides?.length ?? 0}</span>
                  </button>
                  {visibleCategories.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCat(c.key)}
                      className={cn(
                        "text-sm text-left px-2 py-1.5 rounded hover:bg-accent flex items-center justify-between",
                        activeCat === c.key && "bg-accent font-medium"
                      )}
                    >
                      <span>{c.emoji} {c.label}</span>
                      <span className="text-xs text-muted-foreground">{counts?.[c.key] ?? 0}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {menuCfg?.customLinks && menuCfg.customLinks.length > 0 && (
                <div className="rounded-lg border bg-card p-3">
                  <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">Atalhos</h2>
                  <nav className="flex flex-col gap-1">
                    {menuCfg.customLinks.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        className="text-sm px-2 py-1.5 rounded hover:bg-accent"
                      >
                        {l.emoji} {l.label}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
            </aside>
          )}

          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredGuides.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuides.map((guide) => (
                  <Link key={guide.id} to={`/guia/${guide.slug}`} className="group block">
                    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                      <div className="aspect-[16/10] overflow-hidden">
                        {guide.image_url ? (
                          <img src={guide.image_url} alt={guide.title} loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="outline" className="mb-2">{guide.category}</Badge>
                        <h3 className="font-semibold font-serif line-clamp-2 group-hover:text-primary transition-colors">
                          {guide.title}
                        </h3>
                        {guide.excerpt && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{guide.excerpt}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{guide.author_name}</span>
                          {guide.published_at && (
                            <>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(guide.published_at), { addSuffix: true, locale: ptBR })}</span>
                            </>
                          )}
                          {guide.steps.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{guide.steps.length} passos</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {activeCat === "todos" ? "Nenhum guia publicado ainda." : "Nenhum guia nesta categoria."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
