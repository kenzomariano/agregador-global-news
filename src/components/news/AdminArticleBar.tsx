import { useState } from "react";
import { Pencil, RefreshCw, Languages, Settings2, CheckCircle2, EyeOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArticleEditDialog } from "@/components/admin/ArticleEditDialog";
import { isoToLocalInput, localInputToIso } from "@/lib/scheduledAt";
import type { Article, ArticleStatus } from "@/hooks/useArticles";
import type { CategoryKey } from "@/lib/categories";

interface AdminArticleBarProps {
  article: Article;
}

export function AdminArticleBar({ article }: AdminArticleBarProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"rescrape" | "translate" | "publish" | "delete" | null>(null);

  const [editForm, setEditForm] = useState({
    title: article.title,
    excerpt: article.excerpt || "",
    content: article.content || "",
    category: article.category as CategoryKey,
    subcategory: article.subcategory || "",
    status: article.status as ArticleStatus,
    image_url: article.image_url || "",
    video_url: (article as any).video_url || "",
    is_featured: article.is_featured,
  });

  if (!isAdmin) return null;

  const openEdit = () => {
    setEditForm({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category as CategoryKey,
      subcategory: article.subcategory || "",
      status: article.status as ArticleStatus,
      image_url: article.image_url || "",
      video_url: (article as any).video_url || "",
      is_featured: article.is_featured,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const titleChanged = editForm.title !== article.title;
      let newSlug = article.slug;
      if (titleChanged) {
        const { data: slugData } = await supabase.rpc("generate_slug", { title: editForm.title });
        if (slugData) {
          newSlug = slugData;
          await supabase.from("article_redirects").upsert(
            { old_slug: article.slug, new_slug: newSlug, article_id: article.id },
            { onConflict: "old_slug" }
          );
        }
      }
      const { error } = await supabase.from("articles").update({
        title: editForm.title,
        slug: newSlug,
        excerpt: editForm.excerpt || null,
        content: editForm.content || null,
        category: editForm.category,
        image_url: editForm.image_url || null,
        video_url: editForm.video_url || null,
        is_featured: editForm.is_featured,
        status: editForm.status,
        updated_at: new Date().toISOString(),
      }).eq("id", article.id);
      if (error) throw error;
      toast({ title: "Artigo atualizado!" });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["article"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      if (titleChanged) window.history.replaceState(null, "", `/noticia/${newSlug}`);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleRescrape = async () => {
    setBusy("rescrape");
    try {
      const { error } = await supabase.functions.invoke("rescrape-article", {
        body: { articleId: article.id, url: article.original_url },
      });
      if (error) throw error;
      toast({ title: "Artigo re-extraído!" });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    } catch (e: any) {
      toast({ title: "Erro no rescrape", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleTranslate = async () => {
    setBusy("translate");
    try {
      const { error } = await supabase.functions.invoke("translate-article", {
        body: { articleId: article.id },
      });
      if (error) throw error;
      toast({ title: "Artigo traduzido!" });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    } catch (e: any) {
      toast({ title: "Erro na tradução", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleTogglePublish = async () => {
    setBusy("publish");
    const newStatus: ArticleStatus = article.status === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: newStatus,
          published_at: newStatus === "published" && !article.published_at ? new Date().toISOString() : article.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id);
      if (error) throw error;
      toast({ title: newStatus === "published" ? "Artigo publicado!" : "Artigo despublicado" });
      queryClient.invalidateQueries({ queryKey: ["article"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      const { error } = await supabase.rpc("delete_article_with_tags", { article_uuid: article.id });
      if (error) throw error;
      toast({ title: "Artigo apagado" });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Erro ao apagar", description: e.message, variant: "destructive" });
      setBusy(null);
    }
  };

  const isPublished = article.status === "published";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary mr-2">
          <Settings2 className="h-3.5 w-3.5" /> Admin
        </span>
        <Button size="sm" variant="outline" onClick={openEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        <Button size="sm" variant="outline" onClick={handleRescrape} disabled={busy !== null}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy === "rescrape" ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Button size="sm" variant="outline" onClick={handleTranslate} disabled={busy !== null}>
          <Languages className={`h-3.5 w-3.5 mr-1.5 ${busy === "translate" ? "animate-pulse" : ""}`} />
          Traduzir
        </Button>
        <Button
          size="sm"
          variant={isPublished ? "outline" : "default"}
          onClick={handleTogglePublish}
          disabled={busy !== null}
        >
          {isPublished ? (
            <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Despublicar</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Publicar</>
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={busy !== null}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Apagar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar este artigo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente. O artigo "{article.title}" será removido junto com tags associadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Apagar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ArticleEditDialog
        article={editing ? article : null}
        editForm={editForm}
        onFormChange={setEditForm}
        onClose={() => setEditing(false)}
        onSave={handleSave}
      />
    </>
  );
}
