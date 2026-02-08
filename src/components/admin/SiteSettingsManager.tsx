import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings, useUpdateSiteSetting } from "@/hooks/useSiteSettings";

export function SiteSettingsManager() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();

  const [form, setForm] = useState({
    site_title: "",
    site_description: "",
    meta_keywords: "",
    adsense_publisher_id: "",
    primary_categories: "",
    secondary_categories: "",
    affiliate_mercadolivre_id: "",
    affiliate_shopee_id: "",
  });

  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc, s) => {
        acc[s.key] = s.value || "";
        return acc;
      }, {} as Record<string, string>);

      setForm({
        site_title: settingsMap.site_title || "",
        site_description: settingsMap.site_description || "",
        meta_keywords: settingsMap.meta_keywords || "",
        adsense_publisher_id: settingsMap.adsense_publisher_id || "",
        primary_categories: settingsMap.primary_categories || "",
        secondary_categories: settingsMap.secondary_categories || "",
        affiliate_mercadolivre_id: settingsMap.affiliate_mercadolivre_id || "",
        affiliate_shopee_id: settingsMap.affiliate_shopee_id || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const promises = Object.entries(form).map(([key, value]) =>
        updateSetting.mutateAsync({ key, value })
      );
      await Promise.all(promises);
      toast({ title: "Configurações salvas!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configurações do Site</h2>
          <p className="text-sm text-muted-foreground">
            Personalize o título, descrição e outras configurações
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSetting.isPending}>
          {updateSetting.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SEO e Meta Tags</CardTitle>
            <CardDescription>
              Configure título e descrição para melhorar o SEO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">Título do Site</Label>
              <Input
                id="site_title"
                value={form.site_title}
                onChange={(e) => setForm({ ...form, site_title: e.target.value })}
                placeholder="DESIGNE Notícias"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 60 caracteres recomendado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_description">Descrição do Site</Label>
              <Textarea
                id="site_description"
                rows={3}
                value={form.site_description}
                onChange={(e) => setForm({ ...form, site_description: e.target.value })}
                placeholder="Seu portal de notícias agregadas..."
              />
              <p className="text-xs text-muted-foreground">
                Máximo 160 caracteres recomendado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_keywords">Palavras-chave</Label>
              <Input
                id="meta_keywords"
                value={form.meta_keywords}
                onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                placeholder="notícias, brasil, política..."
              />
              <p className="text-xs text-muted-foreground">
                Separadas por vírgula
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monetização</CardTitle>
            <CardDescription>
              Configure sua integração com o Google AdSense
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adsense_publisher_id">ID do Publisher AdSense</Label>
              <Input
                id="adsense_publisher_id"
                value={form.adsense_publisher_id}
                onChange={(e) => setForm({ ...form, adsense_publisher_id: e.target.value })}
                placeholder="ca-pub-XXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Encontre seu ID no painel do AdSense
              </p>
            </div>

            <Separator />

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Como configurar o AdSense:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse sua conta do Google AdSense</li>
                <li>Copie o ID do publisher (ca-pub-...)</li>
                <li>Cole no campo acima</li>
                <li>Configure os slots de anúncio na aba "Anúncios"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Programas de Afiliados</CardTitle>
            <CardDescription>
              Configure seus IDs de afiliado do Mercado Livre e Shopee
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="affiliate_mercadolivre_id">ID Afiliado Mercado Livre</Label>
              <Input
                id="affiliate_mercadolivre_id"
                value={form.affiliate_mercadolivre_id}
                onChange={(e) => setForm({ ...form, affiliate_mercadolivre_id: e.target.value })}
                placeholder="Seu ID de afiliado ML"
              />
              <p className="text-xs text-muted-foreground">
                Encontre no painel de afiliados do Mercado Livre
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliate_shopee_id">ID Afiliado Shopee</Label>
              <Input
                id="affiliate_shopee_id"
                value={form.affiliate_shopee_id}
                onChange={(e) => setForm({ ...form, affiliate_shopee_id: e.target.value })}
                placeholder="Seu ID de afiliado Shopee"
              />
              <p className="text-xs text-muted-foreground">
                Encontre no painel de afiliados da Shopee
              </p>
            </div>

            <Separator />

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Como funciona:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Cadastre-se nos programas de afiliados do ML e Shopee</li>
                <li>Copie seu ID de afiliado de cada plataforma</li>
                <li>Cole nos campos acima e salve</li>
                <li>Os links de produtos serão gerados automaticamente com seu código</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Categorias do Menu</CardTitle>
            <CardDescription>
              Defina quais categorias aparecem como principais e secundárias no menu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary_categories">Categorias Principais</Label>
                <Input
                  id="primary_categories"
                  value={form.primary_categories}
                  onChange={(e) => setForm({ ...form, primary_categories: e.target.value })}
                  placeholder="politica,economia,tecnologia"
                />
                <p className="text-xs text-muted-foreground">
                  Separadas por vírgula, aparecem diretamente no menu
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_categories">Categorias Secundárias</Label>
                <Input
                  id="secondary_categories"
                  value={form.secondary_categories}
                  onChange={(e) => setForm({ ...form, secondary_categories: e.target.value })}
                  placeholder="saude,ciencia,mundo"
                />
                <p className="text-xs text-muted-foreground">
                  Separadas por vírgula, aparecem em dropdown "Mais"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
