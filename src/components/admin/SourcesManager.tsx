import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Globe, FileText, Package, Upload, Link } from "lucide-react";
import { ScrapeQueuePanel } from "./ScrapeQueuePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useSources, type NewsSource } from "@/hooks/useSources";
import { supabase } from "@/integrations/supabase/client";

type SourceType = "article" | "product";

export function SourcesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sources, isLoading } = useSources();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);
  const [sitemapDialogOpen, setSitemapDialogOpen] = useState(false);
  const [selectedSourceForSitemap, setSelectedSourceForSitemap] = useState<NewsSource | null>(null);
  const [sitemapContent, setSitemapContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    is_foreign: false,
    source_type: "article" as SourceType,
    sitemap_url: "",
    scrape_limit: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("news_sources").insert({
        name: formData.name,
        url: formData.url,
        is_foreign: formData.is_foreign,
        source_type: formData.source_type,
        sitemap_url: formData.sitemap_url || null,
        scrape_limit: Math.min(10, Math.max(1, Number(formData.scrape_limit) || 5)),
      });

      if (error) throw error;

      toast({
        title: "Fonte adicionada!",
        description: "A fonte foi cadastrada com sucesso.",
      });

      setFormData({ name: "", url: "", is_foreign: false, source_type: "article", sitemap_url: "", scrape_limit: 5 });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["news-sources"] });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar fonte",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("news_sources").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Fonte removida",
        description: "A fonte foi removida com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["news-sources"] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover fonte",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateScrapeLimit = async (id: string, limit: number) => {
    try {
      const normalized = Math.min(10, Math.max(1, Math.floor(limit)));
      const { error } = await supabase
        .from("news_sources")
        .update({ scrape_limit: normalized })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Limite atualizado",
        description: `A fonte agora extrai até ${normalized} item(ns) por execução.`,
      });

      queryClient.invalidateQueries({ queryKey: ["news-sources"] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar limite",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleScrape = async (source: NewsSource, sitemapXml?: string) => {
    setScraping(source.id);
    setSitemapDialogOpen(false);
    setSitemapContent("");

    try {
      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { 
          sourceId: source.id,
          sitemapContent: sitemapXml || undefined,
        },
      });

      if (error) throw error;

      const isProduct = source.source_type === "product";
      const count = isProduct ? data.productsCount : data.articlesCount;
      const itemType = isProduct ? "produtos" : "notícias";

      toast({
        title: "Scraping concluído!",
        description: `${count || 0} ${itemType} foram importados de ${source.name}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["featured-articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    } catch (error: any) {
      toast({
        title: "Erro no scraping",
        description: error.message || "Não foi possível extrair o conteúdo.",
        variant: "destructive",
      });
    } finally {
      setScraping(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSitemapContent(content);
    };
    reader.readAsText(file);
  };

  const openSitemapDialog = (source: NewsSource) => {
    setSelectedSourceForSitemap(source);
    setSitemapDialogOpen(true);
  };

  const handleSitemapScrape = () => {
    if (selectedSourceForSitemap) {
      handleScrape(selectedSourceForSitemap, sitemapContent || undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scrape Queue Panel */}
      <ScrapeQueuePanel />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gerenciar Fontes</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre sites para agregar conteúdo automaticamente
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Fonte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Fonte</DialogTitle>
              <DialogDescription>
                Adicione um novo site para extrair conteúdo automaticamente.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Fonte</Label>
                <Input
                  id="name"
                  placeholder="Ex: Folha de São Paulo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL do Site</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.exemplo.com.br"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Tipo de Conteúdo</Label>
                <RadioGroup
                  value={formData.source_type}
                  onValueChange={(value) => setFormData({ ...formData, source_type: value as SourceType })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="article" id="article-src" />
                    <Label htmlFor="article-src" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Artigos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="product" id="product-src" />
                    <Label htmlFor="product-src" className="flex items-center gap-2 cursor-pointer">
                      <Package className="h-4 w-4" />
                      Produtos
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitemap_url">URL do Sitemap (opcional)</Label>
                <Input
                  id="sitemap_url"
                  type="url"
                  placeholder="https://www.exemplo.com.br/sitemap.xml"
                  value={formData.sitemap_url}
                  onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scrape_limit">Limite por execução (1–10)</Label>
                <Input
                  id="scrape_limit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  value={formData.scrape_limit}
                  onChange={(e) => setFormData({ ...formData, scrape_limit: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_foreign">Site Internacional</Label>
                  <p className="text-sm text-muted-foreground">
                    Conteúdo será traduzido para Português
                  </p>
                </div>
                <Switch
                  id="is_foreign"
                  checked={formData.is_foreign}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_foreign: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sources && sources.length > 0 ? (
        <div className="space-y-3">
          {sources.map((source) => {
            const isProduct = source.source_type === "product";

            return (
              <Card key={source.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isProduct ? "bg-orange-500/10" : "bg-primary/10"}`}>
                      {isProduct ? (
                        <Package className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Globe className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{source.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant={isProduct ? "secondary" : "default"} className="text-xs">
                          {isProduct ? "Produtos" : "Artigos"}
                        </Badge>
                        {source.is_foreign && (
                          <Badge variant="outline" className="text-xs">Internacional</Badge>
                        )}
                        {source.sitemap_url && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Link className="h-3 w-3" />
                            Sitemap
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground" htmlFor={`limit-${source.id}`}>
                        Limite
                      </Label>
                      <Input
                        id={`limit-${source.id}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={10}
                        className="w-16 h-8"
                        defaultValue={source.scrape_limit ?? 5}
                        onBlur={(e) => handleUpdateScrapeLimit(source.id, Number(e.currentTarget.value))}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSitemapDialog(source)}
                        disabled={scraping === source.id}
                      >
                        <Upload className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Sitemap</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScrape(source)}
                        disabled={scraping === source.id}
                      >
                        <RefreshCw className={`h-4 w-4 sm:mr-1 ${scraping === source.id ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">{scraping === source.id ? "..." : "Extrair"}</span>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover fonte?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso irá remover a fonte "{source.name}" e todo o conteúdo associado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(source.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma fonte cadastrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Adicione sites de notícias ou lojas para começar a agregar conteúdo.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Fonte
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sitemap Upload Dialog */}
      <Dialog open={sitemapDialogOpen} onOpenChange={setSitemapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Sitemap</DialogTitle>
            <DialogDescription>
              Cole o conteúdo XML do sitemap ou faça upload de um arquivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo XML</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xml,text/xml"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sitemap-content">Ou cole o XML</Label>
              <Textarea
                id="sitemap-content"
                rows={8}
                value={sitemapContent}
                onChange={(e) => setSitemapContent(e.target.value)}
                placeholder="<?xml version='1.0'?>..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSitemapDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSitemapScrape}>
              Extrair do Sitemap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
