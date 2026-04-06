import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useGenerateArticleFaqs } from "@/hooks/useArticleFaqs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useArticles, type Article, type ArticleStatus } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { ArticleFilters } from "./ArticleFilters";
import { ArticleBulkActions } from "./ArticleBulkActions";
import { ArticleListItem } from "./ArticleListItem";
import { ArticleEditDialog } from "./ArticleEditDialog";
import type { CategoryKey } from "@/lib/categories";

export function ArticlesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: articlesData, isLoading } = useArticles(undefined, 100);
  const articles = articlesData?.articles;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [rescraping, setRescraping] = useState<string | null>(null);
  const [bulkRescraping, setBulkRescraping] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [generatingFaqId, setGeneratingFaqId] = useState<string | null>(null);
  const generateFaq = useGenerateArticleFaqs();

  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "" as CategoryKey,
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
      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [articles, searchTerm, categoryFilter, sourceFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredArticles) {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setEditForm({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category,
      image_url: article.image_url || "",
      video_url: (article as any).video_url || "",
      is_featured: article.is_featured,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingArticle) return;

    try {
      const titleChanged = editForm.title !== editingArticle.title;
      let newSlug = editingArticle.slug;

      // If title changed, generate new slug and create redirect
      if (titleChanged) {
        const { data: slugData } = await supabase.rpc("generate_slug", { title: editForm.title });
        if (slugData) {
          newSlug = slugData;

          // Save redirect from old slug to new slug
          await supabase.from("article_redirects").upsert(
            {
              old_slug: editingArticle.slug,
              new_slug: newSlug,
              article_id: editingArticle.id,
            },
            { onConflict: "old_slug" }
          );
        }
      }

      const { error } = await supabase
        .from("articles")
        .update({
          title: editForm.title,
          slug: newSlug,
          excerpt: editForm.excerpt || null,
          content: editForm.content || null,
          category: editForm.category,
          image_url: editForm.image_url || null,
          video_url: editForm.video_url || null,
          is_featured: editForm.is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingArticle.id);

      if (error) throw error;

      toast({
        title: "Artigo atualizado!",
        description: titleChanged
          ? "Alterações salvas. Redirecionamento criado para a URL antiga."
          : "As alterações foram salvas com sucesso.",
      });

      setEditingArticle(null);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.rpc("delete_article_with_tags", {
        article_uuid: id,
      });

      if (error) throw error;

      toast({
        title: "Artigo removido",
        description: "O artigo foi excluído com sucesso.",
      });

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);

    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map((articleId) =>
          supabase.rpc("delete_article_with_tags", { article_uuid: articleId })
        )
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      toast({
        title: "Artigos removidos",
        description: `${ids.length} artigo(s) excluído(s) com sucesso.`,
      });

      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRescrape = async (article: Article) => {
    setRescraping(article.id);

    try {
      const { data, error } = await supabase.functions.invoke("rescrape-article", {
        body: { articleId: article.id, url: article.original_url },
      });

      if (error) throw error;

      toast({
        title: "Artigo atualizado!",
        description: "O conteúdo foi extraído novamente com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({
        title: "Erro no rescrape",
        description: error.message || "Não foi possível atualizar o artigo.",
        variant: "destructive",
      });
    } finally {
      setRescraping(null);
    }
  };

  const handleBulkRescrape = async () => {
    if (selectedIds.size === 0) return;
    setBulkRescraping(true);

    try {
      const selected = articles?.filter((a) => selectedIds.has(a.id)) || [];
      let success = 0;
      let failed = 0;

      for (const article of selected) {
        try {
          await supabase.functions.invoke("rescrape-article", {
            body: { articleId: article.id, url: article.original_url },
          });
          success++;
        } catch {
          failed++;
        }
      }

      toast({
        title: "Atualização concluída",
        description: `${success} artigo(s) atualizado(s)${failed > 0 ? `, ${failed} falha(s)` : ""}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } finally {
      setBulkRescraping(false);
    }
  };

  const handleBulkFeature = async (featured: boolean) => {
    if (selectedIds.size === 0) return;

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("articles")
        .update({ is_featured: featured, updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      toast({
        title: featured ? "Artigos destacados" : "Destaque removido",
        description: `${ids.length} artigo(s) atualizado(s).`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateFaq = async (articleId: string) => {
    setGeneratingFaqId(articleId);
    try {
      await generateFaq.mutateAsync(articleId);
      toast({
        title: "FAQ gerado!",
        description: "Perguntas frequentes criadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar FAQ",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFaqId(null);
    }
  };

  const allSelected = filteredArticles && filteredArticles.length > 0 && 
    filteredArticles.every((a) => selectedIds.has(a.id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ArticleFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        sources={sources || []}
      />

      <ArticleBulkActions
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkRescrape={handleBulkRescrape}
        onBulkFeature={handleBulkFeature}
        isDeleting={bulkDeleting}
        isRescraping={bulkRescraping}
      />

      {filteredArticles && filteredArticles.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            id="select-all-manager"
          />
          <label htmlFor="select-all-manager" className="cursor-pointer text-muted-foreground">
            Selecionar todos ({filteredArticles.length})
          </label>
        </div>
      )}

      {filteredArticles && filteredArticles.length > 0 ? (
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
              onGenerateFaq={handleGenerateFaq}
              isRescraping={rescraping === article.id}
              isGeneratingFaq={generatingFaqId === article.id}
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

      <ArticleEditDialog
        article={editingArticle}
        editForm={editForm}
        onFormChange={setEditForm}
        onClose={() => setEditingArticle(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
