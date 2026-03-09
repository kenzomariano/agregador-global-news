import { useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { ArticleCard } from "@/components/news/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingArticles, type TrendingPeriod } from "@/hooks/useArticles";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Calendar, CalendarDays, CalendarRange } from "lucide-react";

const PERIODS: { value: TrendingPeriod; label: string; icon: React.ReactNode }[] = [
  { value: "today", label: "Hoje", icon: <Calendar className="h-4 w-4" /> },
  { value: "week", label: "Semana", icon: <CalendarDays className="h-4 w-4" /> },
  { value: "month", label: "Mês", icon: <CalendarRange className="h-4 w-4" /> },
];

function RankingList({ period }: { period: TrendingPeriod }) {
  const { data: articles, isLoading } = useTrendingArticles(20, period);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Nenhuma notícia encontrada neste período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article, index) => (
        <div key={article.id} className="flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
            {index + 1}
          </span>
          <div className="flex-1">
            <ArticleCard article={article} variant="horizontal" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TrendingPage() {
  const [period, setPeriod] = useState<TrendingPeriod>("today");

  return (
    <>
      <SEOHead
        title="Notícias Mais Lidas"
        description="As notícias mais lidas e populares do momento no DESIGNE. Confira o que está em alta no Brasil e no mundo."
        keywords={["mais lidas", "trending", "populares", "notícias", "brasil"]}
      />

      <div className="container py-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Mais Lidas" },
        ]} />
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Notícias Mais Lidas
          </h1>
          <p className="text-muted-foreground mt-2">
            Rankings de popularidade por período
          </p>
        </header>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as TrendingPeriod)}>
          <TabsList className="mb-6">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="gap-2">
                {p.icon}
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PERIODS.map((p) => (
            <TabsContent key={p.value} value={p.value}>
              <RankingList period={p.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
