import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, RefreshCw, Pencil, ExternalLink, Eye, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useArticles, type Article } from "@/hooks/useArticles";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { ArticleTagsManager } from "@/components/admin/ArticleTagsManager";

export default function ArticlesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: articles, isLoading } = useArticles(undefined, 100);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [rescraping, setRescraping] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "" as CategoryKey,
    image_url: "",
    video_url: "",
    is_featured: false,
  });

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
      const { error } = await supabase
        .from("articles")
        .update({
          title: editForm.title,
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
        description: "As alterações foram salvas com sucesso.",
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
      const { error } = await supabase.from("articles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Artigo removido",
        description: "O artigo foi excluído com sucesso.",
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

  return (
    <>
      <SEOHead
        title="Gerenciar Artigos"
        description="Gerencie os artigos publicados no DESIGNE."
      />

      <div className="container py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif">Gerenciar Artigos</h1>
          <p className="text-muted-foreground mt-2">
            Edite, atualize ou remova artigos publicados.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Articles list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <div className="space-y-3">
            {filteredArticles.map((article) => {
              const category = CATEGORIES[article.category as CategoryKey];
              const timeAgo = article.published_at
                ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
                : "recém publicado";

              return (
                <Card key={article.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                        {article.image_url ? (
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            📰
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {category?.label || article.category}
                              </Badge>
                              {article.is_featured && (
                                <Badge variant="default" className="text-xs">
                                  Destaque
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold line-clamp-1">{article.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{article.news_sources?.name}</span>
                              <span>•</span>
                              <span>{timeAgo}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {article.views_count}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Ver artigo"
                            >
                              <Link to={`/noticia/${article.slug}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRescrape(article)}
                              disabled={rescraping === article.id}
                              title="Atualizar via scraping"
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${rescraping === article.id ? "animate-spin" : ""}`}
                              />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(article)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O artigo "{article.title}" será
                                    permanentemente removido.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(article.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Artigo</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no artigo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-excerpt">Resumo</Label>
              <Textarea
                id="edit-excerpt"
                rows={2}
                value={editForm.excerpt}
                onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Conteúdo</Label>
              <Textarea
                id="edit-content"
                rows={10}
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value as CategoryKey })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-featured">Destaque</Label>
                <Select
                  value={editForm.is_featured ? "true" : "false"}
                  onValueChange={(value) => setEditForm({ ...editForm, is_featured: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-image">URL da Imagem</Label>
              <Input
                id="edit-image"
                type="url"
                value={editForm.image_url}
                onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-video">URL do Vídeo (embed)</Label>
              <Input
                id="edit-video"
                type="url"
                placeholder="https://www.youtube.com/embed/..."
                value={editForm.video_url}
                onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
              />
            </div>

            <Separator className="my-4" />

            {/* Tags Manager */}
            {editingArticle && (
              <ArticleTagsManager
                articleId={editingArticle.id}
                articleTitle={editingArticle.title}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArticle(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
