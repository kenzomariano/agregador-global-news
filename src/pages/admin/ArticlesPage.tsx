import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useArticles, type Article, type ArticleStatus } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { ArticleFilters } from "@/components/admin/ArticleFilters";
import { ArticleBulkActions } from "@/components/admin/ArticleBulkActions";
import { ArticleListItem } from "@/components/admin/ArticleListItem";
import { ArticleEditDialog } from "@/components/admin/ArticleEditDialog";
import type { CategoryKey } from "@/lib/categories";

export default function ArticlesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: articlesData, isLoading } = useArticles(undefined, 100);
  const articles = articlesData?.articles;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [rescraping, setRescraping] = useState<string | null>(null);
  const [bulkRescraping, setBulkRescraping] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ done: 0, total: 0 });

  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "" as CategoryKey,
    subcategory: "",
    status: "draft" as ArticleStatus,
    image_url: "",
    video_url: "",
    is_featured: false,
  });

  const { data: sources } = useQuery({
    queryKey: ["news-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_sources")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredArticles = useMemo(() => {
    return articles?.filter((article) => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
      const matchesSource = sourceFilter === "all" || article.source_id === sourceFilter;
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      return matchesSearch && matchesCategory && matchesSource && matchesStatus;
    });
  }, [articles, searchTerm, categoryFilter, sourceFilter, statusFilter]);

  const draftCount = useMemo(() => {
    return articles?.filter((a) => a.status === "draft").length || 0;
  }, [articles]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredArticles) {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setEditForm({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category,
      subcategory: article.subcategory || "",
      status: article.status,
      image_url: article.image_url || "",
      video_url: (article as any).video_url || "",
      is_featured: article.is_featured,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingArticle) return;
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          title: editForm.title,
          excerpt: editForm.excerpt || null,
          content: editForm.content || null,
          category: editForm.category,
          subcategory: editForm.subcategory || null,
          status: editForm.status,
          image_url: editForm.image_url || null,
          video_url: editForm.video_url || null,
          is_featured: editForm.is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingArticle.id);

      if (error) throw error;
      toast({ title: "Artigo atualizado!", description: "As alterações foram salvas com sucesso." });
      setEditingArticle(null);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: ArticleStatus) => {
    try {
      const { error } = await supabase
        .from("articles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast({ title: status === "published" ? "Artigo publicado!" : "Status atualizado" });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkStatusChange = async (status: ArticleStatus) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("articles")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      toast({
        title: status === "published" ? "Artigos publicados!" : "Status atualizado",
        description: `${ids.length} artigo(s) atualizado(s).`,
      });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.rpc("delete_article_with_tags", { article_uuid: id });
      if (error) throw error;
      toast({ title: "Artigo removido" });
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map((id) => supabase.rpc("delete_article_with_tags", { article_uuid: id })));
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      toast({ title: "Artigos removidos", description: `${ids.length} artigo(s) excluído(s).` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRescrape = async (article: Article) => {
    setRescraping(article.id);
    try {
      const { error } = await supabase.functions.invoke("rescrape-article", {
        body: { articleId: article.id, url: article.original_url },
      });
      if (error) throw error;
      toast({ title: "Artigo atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro no rescrape", description: error.message, variant: "destructive" });
    } finally {
      setRescraping(null);
    }
  };

  const handleBulkRescrape = async () => {
    if (selectedIds.size === 0) return;
    setBulkRescraping(true);
    try {
      const selected = articles?.filter((a) => selectedIds.has(a.id)) || [];
      let success = 0, failed = 0;
      for (const article of selected) {
        try {
          await supabase.functions.invoke("rescrape-article", { body: { articleId: article.id, url: article.original_url } });
          success++;
        } catch { failed++; }
      }
      toast({ title: "Atualização concluída", description: `${success} atualizado(s)${failed > 0 ? `, ${failed} falha(s)` : ""}.` });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } finally {
      setBulkRescraping(false);
    }
  };

  const handleBulkFeature = async (featured: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("articles").update({ is_featured: featured, updated_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
      toast({ title: featured ? "Artigos destacados" : "Destaque removido", description: `${ids.length} artigo(s) atualizado(s).` });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkTranslate = async () => {
    setBulkTranslating(true);
    try {
      const englishArticles = articles?.filter((a) => {
        const hasAccents = /[àáâãçéêíóôõúü]/i.test(a.title);
        if (hasAccents) return false;
        const enWords = a.title.match(/\b[a-zA-Z]{3,}\b/g) || [];
        return enWords.length >= 3;
      }) || [];
      if (englishArticles.length === 0) { toast({ title: "Nenhum artigo em inglês encontrado" }); return; }
      setTranslateProgress({ done: 0, total: englishArticles.length });
      let success = 0, failed = 0;
      for (const article of englishArticles) {
        try {
          await supabase.functions.invoke("translate-article", { body: { articleId: article.id } });
          success++;
        } catch { failed++; }
        setTranslateProgress({ done: success + failed, total: englishArticles.length });
      }
      toast({ title: "Tradução concluída", description: `${success} traduzido(s)${failed > 0 ? `, ${failed} falha(s)` : ""}.` });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } finally {
      setBulkTranslating(false);
      setTranslateProgress({ done: 0, total: 0 });
    }
  };

  const englishArticleCount = useMemo(() => {
    return articles?.filter((a) => {
      const hasAccents = /[àáâãçéêíóôõúü]/i.test(a.title);
      if (hasAccents) return false;
      const enWords = a.title.match(/\b[a-zA-Z]{3,}\b/g) || [];
      return enWords.length >= 3;
    }).length || 0;
  }, [articles]);

  const allSelected = filteredArticles && filteredArticles.length > 0 && filteredArticles.every((a) => selectedIds.has(a.id));

  return (
    <>
      <SEOHead title="Gerenciar Artigos" description="Gerencie os artigos publicados no DESIGNE." />

      <div className="container py-6 max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-serif">Gerenciar Artigos</h1>
              <p className="text-muted-foreground mt-2">
                Edite, aprove ou remova artigos.
                {draftCount > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    {draftCount} rascunho(s) aguardando aprovação
                  </span>
                )}
              </p>
            </div>
            {englishArticleCount > 0 && (
              <Button onClick={handleBulkTranslate} disabled={bulkTranslating} variant="outline" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${bulkTranslating ? "animate-spin" : ""}`} />
                {bulkTranslating
                  ? `Traduzindo ${translateProgress.done}/${translateProgress.total}...`
                  : `Re-traduzir ${englishArticleCount} artigo(s) em inglês`}
              </Button>
            )}
          </div>
        </header>

        <ArticleFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sources={sources || []}
        />

        <ArticleBulkActions
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkDelete={handleBulkDelete}
          onBulkRescrape={handleBulkRescrape}
          onBulkFeature={handleBulkFeature}
          onBulkStatusChange={handleBulkStatusChange}
          isDeleting={bulkDeleting}
          isRescraping={bulkRescraping}
        />

        {filteredArticles && filteredArticles.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} id="select-all" />
            <label htmlFor="select-all" className="cursor-pointer text-muted-foreground">
              Selecionar todos ({filteredArticles.length})
            </label>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <div className="space-y-2">
            {filteredArticles.map((article) => (
              <ArticleListItem
                key={article.id}
                article={article}
                isSelected={selectedIds.has(article.id)}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRescrape={handleRescrape}
                onStatusChange={handleStatusChange}
                isRescraping={rescraping === article.id}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ArticleEditDialog
        article={editingArticle}
        editForm={editForm}
        onFormChange={setEditForm}
        onClose={() => setEditingArticle(null)}
        onSave={handleSaveEdit}
      />
    </>
  );
}
