import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Rss, Settings, Megaphone, LayoutDashboard } from "lucide-react";
import { SourcesManager } from "@/components/admin/SourcesManager";
import { ArticlesManager } from "@/components/admin/ArticlesManager";
import { AdsManager } from "@/components/admin/AdsManager";
import { SiteSettingsManager } from "@/components/admin/SiteSettingsManager";
import { useArticles } from "@/hooks/useArticles";
import { useSources } from "@/hooks/useSources";
import { useAdPlacements } from "@/hooks/useAdPlacements";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: articlesData } = useArticles(undefined, 1000);
  const { data: sources } = useSources();
  const { data: ads } = useAdPlacements();

  const stats = {
    articles: articles?.length || 0,
    sources: sources?.length || 0,
    activeSources: sources?.filter(s => s.is_active).length || 0,
    activeAds: ads?.filter(a => a.is_active).length || 0,
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold font-serif">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie seu portal de notícias</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 py-3"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger 
            value="articles" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 py-3"
          >
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">Artigos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sources" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 py-3"
          >
            <Rss className="h-4 w-4" />
            <span className="hidden sm:inline">Fontes</span>
          </TabsTrigger>
          <TabsTrigger 
            value="ads" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 py-3"
          >
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Anúncios</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 py-3"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total de Artigos</CardDescription>
                <CardTitle className="text-3xl">{stats.articles}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Fontes Cadastradas</CardDescription>
                <CardTitle className="text-3xl">{stats.sources}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Fontes Ativas</CardDescription>
                <CardTitle className="text-3xl">{stats.activeSources}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Anúncios Ativos</CardDescription>
                <CardTitle className="text-3xl">{stats.activeAds}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button 
                  onClick={() => setActiveTab("articles")}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Newspaper className="h-5 w-5 text-primary" />
                  <span>Gerenciar Artigos</span>
                </button>
                <button 
                  onClick={() => setActiveTab("sources")}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Rss className="h-5 w-5 text-primary" />
                  <span>Gerenciar Fontes</span>
                </button>
                <button 
                  onClick={() => setActiveTab("ads")}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Megaphone className="h-5 w-5 text-primary" />
                  <span>Configurar Anúncios</span>
                </button>
                <button 
                  onClick={() => setActiveTab("settings")}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Configurações do Site</span>
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dicas</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>• Configure o ID do AdSense nas configurações para monetizar seu site.</p>
                <p>• Adicione banners personalizados para campanhas específicas.</p>
                <p>• Mantenha as fontes atualizadas para conteúdo fresco.</p>
                <p>• Use tags nos artigos para melhor organização e SEO.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="articles">
          <ArticlesManager />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesManager />
        </TabsContent>

        <TabsContent value="ads">
          <AdsManager />
        </TabsContent>

        <TabsContent value="settings">
          <SiteSettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
