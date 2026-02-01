import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Globe, FileText, Package, Upload, Link } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
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
import { useNewsSources, type NewsSource } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";

type SourceType = "article" | "product";

interface ExtendedNewsSource extends Omit<NewsSource, 'source_type' | 'sitemap_url'> {
  source_type: SourceType;
  sitemap_url: string | null;
}

export default function SourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sources, isLoading } = useNewsSources();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);
  const [sitemapDialogOpen, setSitemapDialogOpen] = useState(false);
  const [selectedSourceForSitemap, setSelectedSourceForSitemap] = useState<ExtendedNewsSource | null>(null);
  const [sitemapContent, setSitemapContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    is_foreign: false,
    source_type: "article" as SourceType,
    sitemap_url: "",
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
      });

      if (error) throw error;

      toast({
        title: "Fonte adicionada!",
        description: "A fonte foi cadastrada com sucesso.",
      });

      setFormData({ name: "", url: "", is_foreign: false, source_type: "article", sitemap_url: "" });
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

  const handleScrape = async (source: ExtendedNewsSource, sitemapXml?: string) => {
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

  const openSitemapDialog = (source: ExtendedNewsSource) => {
    setSelectedSourceForSitemap(source);
    setSitemapDialogOpen(true);
  };

  const handleSitemapScrape = () => {
    if (selectedSourceForSitemap) {
      handleScrape(selectedSourceForSitemap, sitemapContent || undefined);
    }
  };

  return (
    <>
      <SEOHead
        title="Gerenciar Fontes"
        description="Adicione e gerencie as fontes de conteúdo do NewsHub Brasil."
      />

      <div className="container py-6 max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">Fontes de Conteúdo</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre sites para agregar notícias ou produtos automaticamente.
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
                      <RadioGroupItem value="article" id="article" />
                      <Label htmlFor="article" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" />
                        Artigos / Notícias
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="product" id="product" />
                      <Label htmlFor="product" className="flex items-center gap-2 cursor-pointer">
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
                  <p className="text-xs text-muted-foreground">
                    Se fornecido, o scraping usará o sitemap para encontrar os itens mais recentes.
                  </p>
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
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="space-y-4">
            {sources.map((source) => {
              const extSource = source as ExtendedNewsSource;
              const isProduct = extSource.source_type === "product";
              
              return (
                <Card key={source.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isProduct ? "bg-orange-500/10" : "bg-primary/10"}`}>
                        {isProduct ? (
                          <Package className="h-6 w-6 text-orange-500" />
                        ) : (
                          <Globe className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{source.name}</h3>
                        <p className="text-sm text-muted-foreground">{source.url}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant={isProduct ? "secondary" : "default"}>
                            {isProduct ? "Produtos" : "Artigos"}
                          </Badge>
                          {source.is_foreign && (
                            <Badge variant="outline">Internacional</Badge>
                          )}
                          {extSource.sitemap_url && (
                            <Badge variant="outline" className="gap-1">
                              <Link className="h-3 w-3" />
                              Sitemap
                            </Badge>
                          )}
                          <Badge variant={source.is_active ? "default" : "outline"}>
                            {source.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSitemapDialog(extSource)}
                        disabled={scraping === source.id}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Sitemap
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScrape(extSource)}
                        disabled={scraping === source.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${scraping === source.id ? "animate-spin" : ""}`} />
                        {scraping === source.id ? "Extraindo..." : "Extrair"}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover fonte?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso irá remover a fonte "{source.name}" e todo o conteúdo associado. Esta ação não pode ser desfeita.
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhuma fonte cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione sites para começar a agregar conteúdo.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Fonte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sitemap Upload Dialog */}
      <Dialog open={sitemapDialogOpen} onOpenChange={setSitemapDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar via Sitemap</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo XML de sitemap ou cole o conteúdo para extrair os itens mais recentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload de Arquivo XML</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sitemap-content">Cole o conteúdo do Sitemap</Label>
              <Textarea
                id="sitemap-content"
                placeholder="<?xml version='1.0' encoding='UTF-8'?>..."
                value={sitemapContent}
                onChange={(e) => setSitemapContent(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            {!sitemapContent && selectedSourceForSitemap?.sitemap_url && (
              <p className="text-sm text-muted-foreground">
                💡 Esta fonte já tem um sitemap configurado: <br />
                <span className="font-mono text-xs break-all">{selectedSourceForSitemap.sitemap_url}</span>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSitemapDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSitemapScrape}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {sitemapContent ? "Extrair do Sitemap" : "Usar Sitemap Configurado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
