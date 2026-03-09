import { useState } from "react";
import { Plus, Trash2, Edit, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useGuides, useCreateGuide, useUpdateGuide, useDeleteGuide, type Guide, type GuideStep } from "@/hooks/useGuides";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "geral",
  author_name: "Equipe DESIGNE",
  is_published: false,
  steps: [] as GuideStep[],
};

export function GuidesManager() {
  const { toast } = useToast();
  const { data: guides, isLoading } = useGuides(false);
  const createGuide = useCreateGuide();
  const updateGuide = useUpdateGuide();
  const deleteGuide = useDeleteGuide();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setEditingGuide(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setForm({
      title: guide.title,
      slug: guide.slug,
      excerpt: guide.excerpt || "",
      content: guide.content || "",
      image_url: guide.image_url || "",
      category: guide.category,
      author_name: guide.author_name,
      is_published: guide.is_published,
      steps: guide.steps || [],
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: editingGuide ? f.slug : generateSlug(title),
    }));
  };

  const addStep = () => {
    setForm((f) => ({ ...f, steps: [...f.steps, { title: "", description: "" }] }));
  };

  const updateStep = (index: number, field: keyof GuideStep, value: string) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const removeStep = (index: number) => {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content: form.content || null,
        image_url: form.image_url || null,
        category: form.category,
        author_name: form.author_name,
        is_published: form.is_published,
        steps: form.steps,
        ...(form.is_published && !editingGuide?.published_at ? { published_at: new Date().toISOString() } : {}),
      };

      if (editingGuide) {
        await updateGuide.mutateAsync({ id: editingGuide.id, ...payload });
        toast({ title: "Guia atualizado!" });
      } else {
        await createGuide.mutateAsync(payload);
        toast({ title: "Guia criado!" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGuide.mutateAsync(id);
      toast({ title: "Guia removido" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const togglePublish = async (guide: Guide) => {
    try {
      await updateGuide.mutateAsync({
        id: guide.id,
        is_published: !guide.is_published,
        ...(!guide.is_published && !guide.published_at ? { published_at: new Date().toISOString() } : {}),
      });
      toast({ title: guide.is_published ? "Guia despublicado" : "Guia publicado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Guias Editoriais</h2>
          <p className="text-sm text-muted-foreground">Crie conteúdo evergreen com passo a passo</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Guia
        </Button>
      </div>

      {guides && guides.length > 0 ? (
        <div className="space-y-3">
          {guides.map((guide) => (
            <Card key={guide.id}>
              <CardContent className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{guide.title}</h3>
                    <Badge variant={guide.is_published ? "default" : "outline"}>
                      {guide.is_published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{guide.category}</span>
                    <span>•</span>
                    <span>{guide.steps.length} passos</span>
                    <span>•</span>
                    <span>{guide.author_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => togglePublish(guide)}>
                    {guide.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(guide)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover guia?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(guide.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhum guia criado</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie guias editoriais com passo a passo para gerar conteúdo evergreen.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Novo Guia
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuide ? "Editar Guia" : "Novo Guia"}</DialogTitle>
            <DialogDescription>Preencha as informações do guia editorial.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resumo</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Autor</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Passos (JSON-LD HowTo)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Passo
                </Button>
              </div>
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start border rounded-md p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0 mt-1">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Título do passo"
                      value={step.title}
                      onChange={(e) => updateStep(i, "title", e.target.value)}
                    />
                    <Textarea
                      placeholder="Descrição do passo"
                      value={step.description}
                      onChange={(e) => updateStep(i, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(i)} className="text-destructive flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Conteúdo (Markdown)</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Publicar</Label>
                <p className="text-xs text-muted-foreground">Torne visível para todos</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingGuide ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
