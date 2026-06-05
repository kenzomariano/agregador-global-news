import { useState } from "react";
import { Plus, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RichContentEditor } from "./RichContentEditor";

export function CreateArticleDialog() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [saving, setSaving] = useState(false);

  // manual form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CategoryKey>("brasil");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");

  // import form
  const [importUrl, setImportUrl] = useState("");

  const reset = () => {
    setTitle(""); setExcerpt(""); setContent(""); setCategory("brasil");
    setImageUrl(""); setVideoUrl(""); setOriginalUrl(""); setImportUrl("");
  };

  const handleManualCreate = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: slugData } = await supabase.rpc("generate_slug", { title });
      const slug = slugData || title.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
      const { error } = await supabase.from("articles").insert({
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        category,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        original_url: originalUrl || `manual://${slug}`,
        status: "draft",
      });
      if (error) throw error;
      toast({ title: "Artigo criado!", description: "Salvo como rascunho." });
      qc.invalidateQueries({ queryKey: ["articles"] });
      reset();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim() || !importUrl.startsWith("http")) {
      toast({ title: "URL inválida", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Create stub article
      const stubTitle = `Importando: ${importUrl}`;
      const { data: slugData } = await supabase.rpc("generate_slug", { title: stubTitle });
      const slug = slugData || `import-${Date.now()}`;
      const { data: inserted, error } = await supabase
        .from("articles")
        .insert({
          title: stubTitle,
          slug,
          original_url: importUrl,
          category: "brasil",
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Trigger rescrape + AI rewrite (paraphrases PT content; translates foreign)
      const { error: fnError } = await supabase.functions.invoke("rescrape-article", {
        body: { articleId: inserted.id, url: importUrl, rewrite: true },
      });
      if (fnError) throw fnError;

      toast({
        title: "Artigo importado!",
        description: "O conteúdo foi extraído, reescrito por IA (preservando os fatos) e salvo como rascunho. Revise e publique.",
      });
      qc.invalidateQueries({ queryKey: ["articles"] });
      reset();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Artigo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Artigo</DialogTitle>
          <DialogDescription>
            Escreva manualmente ou importe e traduza um artigo de uma URL externa.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <FileText className="h-4 w-4 mr-2" /> Manual
            </TabsTrigger>
            <TabsTrigger value="import">
              <LinkIcon className="h-4 w-4 mr-2" /> Importar URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do artigo" />
            </div>
            <div className="space-y-2">
              <Label>Resumo</Label>
              <Textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, { label }]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL Original (opcional)</Label>
                <Input value={originalUrl} onChange={(e) => setOriginalUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Imagem destacada (URL)</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Vídeo embedado (URL)</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <RichContentEditor value={content} onChange={setContent} rows={12} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleManualCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar como rascunho
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>URL do artigo *</Label>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://exemplo.com/noticia"
              />
              <p className="text-xs text-muted-foreground">
                O sistema irá extrair o conteúdo, traduzir para português (se necessário) e salvar como rascunho.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={saving || !importUrl}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar e Traduzir
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
