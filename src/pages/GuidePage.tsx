import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGuideBySlug, type GuideStep } from "@/hooks/useGuides";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, Clock, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function HowToJsonLd({ title, description, steps, image }: { title: string; description: string; steps: GuideStep[]; image?: string | null }) {
  useEffect(() => {
    const id = "guide-howto-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      description,
      ...(image ? { image } : {}),
      step: steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.description,
      })),
    });
    return () => {
      const el = document.getElementById(id);
      if (el?.parentNode) el.parentNode.removeChild(el);
    };
  }, [title, description, steps, image]);
  return null;
}

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: guide, isLoading } = useGuideBySlug(slug || "");

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="container py-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Guia não encontrado</h1>
        <p className="text-muted-foreground">O guia que você procura não existe ou não está publicado.</p>
      </div>
    );
  }

  const timeAgo = guide.published_at
    ? formatDistanceToNow(new Date(guide.published_at), { addSuffix: true, locale: ptBR })
    : "";

  return (
    <>
      <SEOHead
        title={guide.title}
        description={guide.excerpt || `Guia completo: ${guide.title}`}
        keywords={[guide.category, "guia", "tutorial", "como fazer"]}
        image={guide.image_url || undefined}
        type="article"
      />
      {guide.steps.length > 0 && (
        <HowToJsonLd
          title={guide.title}
          description={guide.excerpt || guide.title}
          steps={guide.steps}
          image={guide.image_url}
        />
      )}

      <div className="container py-6 max-w-4xl">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Guias", href: "/guias" },
          { label: guide.title },
        ]} />

        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">{guide.category}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-serif">{guide.title}</h1>
          {guide.excerpt && (
            <p className="text-lg text-muted-foreground mt-3">{guide.excerpt}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {guide.author_name}
            </span>
            {timeAgo && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {timeAgo}
              </span>
            )}
          </div>
        </header>

        {guide.image_url && (
          <div className="aspect-[16/9] overflow-hidden rounded-xl mb-8">
            <img src={guide.image_url} alt={guide.title} className="h-full w-full object-cover" />
          </div>
        )}

        {/* Steps */}
        {guide.steps.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold font-serif mb-6 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Passo a Passo
            </h2>
            <ol className="space-y-6">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 pt-1">
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Content body */}
        {guide.content && (
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
          </article>
        )}
      </div>
    </>
  );
}
