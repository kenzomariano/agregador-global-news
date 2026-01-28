import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Globe, Check, X } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function SourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sources, isLoading } = useNewsSources();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    is_foreign: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("news_sources").insert({
        name: formData.name,
        url: formData.url,
        is_foreign: formData.is_foreign,
      });

      if (error) throw error;

      toast({
        title: "Fonte adicionada!",
        description: "A fonte de notícias foi cadastrada com sucesso.",
      });

      setFormData({ name: "", url: "", is_foreign: false });
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
        description: "A fonte de notícias foi removida com sucesso.",
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

  const handleScrape = async (source: NewsSource) => {
    setScraping(source.id);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { sourceId: source.id },
      });

      if (error) throw error;

      toast({
        title: "Scraping concluído!",
        description: `${data.articlesCount || 0} notícias foram importadas de ${source.name}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["featured-articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    } catch (error: any) {
      toast({
        title: "Erro no scraping",
        description: error.message || "Não foi possível extrair as notícias.",
        variant: "destructive",
      });
    } finally {
      setScraping(null);
    }
  };

  return (
    <>
      <SEOHead
        title="Gerenciar Fontes de Notícias"
        description="Adicione e gerencie as fontes de notícias do NewsHub Brasil."
      />

      <div className="container py-6 max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">Fontes de Notícias</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre sites de notícias para agregar conteúdo automaticamente.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Fonte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Fonte de Notícias</DialogTitle>
                <DialogDescription>
                  Adicione um novo site para extrair notícias automaticamente.
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
            {sources.map((source) => (
              <Card key={source.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.url}</p>
                      <div className="flex gap-2 mt-1">
                        {source.is_foreign && (
                          <Badge variant="secondary">Internacional</Badge>
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
                      onClick={() => handleScrape(source)}
                      disabled={scraping === source.id}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${scraping === source.id ? "animate-spin" : ""}`} />
                      {scraping === source.id ? "Extraindo..." : "Extrair Notícias"}
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
                            Isso irá remover a fonte "{source.name}" e todas as notícias associadas. Esta ação não pode ser desfeita.
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
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhuma fonte cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione sites de notícias para começar a agregar conteúdo.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Fonte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
