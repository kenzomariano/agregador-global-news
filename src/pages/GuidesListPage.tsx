import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuides } from "@/hooks/useGuides";
import { BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GuidesListPage() {
  const { data: guides, isLoading } = useGuides(true);

  return (
    <>
      <SEOHead
        title="Guias e Tutoriais"
        description="Guias completos e tutoriais do DESIGNE. Aprenda com passo a passo detalhado sobre tecnologia, economia, saúde e mais."
        keywords={["guias", "tutoriais", "como fazer", "passo a passo"]}
      />

      <div className="container py-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Guias" },
        ]} />

        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Guias e Tutoriais
          </h1>
          <p className="text-muted-foreground mt-2">
            Conteúdo editorial detalhado com passo a passo
          </p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : guides && guides.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Link key={guide.id} to={`/guia/${guide.slug}`} className="group block">
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <div className="aspect-[16/10] overflow-hidden">
                    {guide.image_url ? (
                      <img
                        src={guide.image_url}
                        alt={guide.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2">{guide.category}</Badge>
                    <h3 className="font-semibold font-serif line-clamp-2 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    {guide.excerpt && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{guide.excerpt}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{guide.author_name}</span>
                      {guide.published_at && (
                        <>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(guide.published_at), { addSuffix: true, locale: ptBR })}</span>
                        </>
                      )}
                      {guide.steps.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{guide.steps.length} passos</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum guia publicado ainda.</p>
          </div>
        )}
      </div>
    </>
  );
}
