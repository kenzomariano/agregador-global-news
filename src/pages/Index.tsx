import { useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { HeroBanner } from "@/components/news/HeroBanner";
import { CategorySection } from "@/components/news/CategorySection";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { TrendingMovies } from "@/components/entertainment/TrendingMovies";
import { TrendingTrailers } from "@/components/entertainment/TrendingTrailers";
import { PopularTags } from "@/components/news/PopularTags";
import { AffiliateProducts } from "@/components/products/AffiliateProducts";
import { FAQSection } from "@/components/news/FAQSection";
import { ArticleCard } from "@/components/news/ArticleCard";
import { DailySummary } from "@/components/news/DailySummary";
import { NewsletterWidget } from "@/components/news/NewsletterWidget";
import { HorizontalAd, SidebarAd } from "@/components/ads/AdBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useArticles } from "@/hooks/useArticles";
import type { CategoryKey } from "@/lib/categories";

const MAIN_CATEGORIES: CategoryKey[] = [
  "politica",
  "economia",
  "tecnologia",
  "esportes",
  "mundo",
  "entretenimento",
];

export default function Index() {
  const ITEMS_PER_PAGE = 12;
  const [newsPage, setNewsPage] = useState(1);
  const { data, isLoading } = useArticles(undefined, 50);
  const allArticles = data?.articles;

  // First 5 for banner, rest for paginated cards
  const bannerArticles = allArticles?.slice(0, 5) || [];
  const allRemaining = allArticles?.slice(5) || [];
  const totalPages = Math.ceil(allRemaining.length / ITEMS_PER_PAGE);
  const remainingArticles = allRemaining.slice(
    (newsPage - 1) * ITEMS_PER_PAGE,
    newsPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <SEOHead
        title="Notícias do Brasil e do Mundo"
        description="DESIGNE - Seu portal de notícias agregadas. As informações mais importantes da política, economia, tecnologia, esportes e mais em um só lugar."
        keywords={[
          "notícias",
          "brasil",
          "política",
          "economia",
          "tecnologia",
          "esportes",
          "portal de notícias",
          "agregador de notícias",
        ]}
      />

      <div className="container py-4 sm:py-6 px-3 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Hero Banner */}
            {isLoading ? (
              <Skeleton className="aspect-[16/7] rounded-xl mb-8" />
            ) : (
              <HeroBanner articles={bannerArticles} />
            )}
            {/* Daily Summary */}
            <DailySummary />

            {/* Ad Banner after hero */}
            <HorizontalAd />

            {/* Remaining articles grid */}
            {remainingArticles.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg sm:text-xl font-bold font-serif mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 sm:h-6 rounded-full bg-primary" />
                  Últimas Notícias
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {remainingArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage((p) => Math.max(1, p - 1))}
                      disabled={newsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          variant={p === newsPage ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8 text-xs"
                          onClick={() => setNewsPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage((p) => Math.min(totalPages, p + 1))}
                      disabled={newsPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Entertainment section with TMDB */}
            <TrendingMovies />

            {/* Affiliate Products */}
            <div className="mb-8">
              <AffiliateProducts category="ofertas" limit={6} title="🔥 Ofertas do Dia" />
            </div>

            {MAIN_CATEGORIES.map((category, index) => (
              <div key={category}>
                <CategorySection category={category} />
                {(index + 1) % 2 === 0 && index < MAIN_CATEGORIES.length - 1 && (
                  <HorizontalAd />
                )}
              </div>
            ))}

            {/* FAQ Section with JSON-LD */}
            <FAQSection />
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-32 space-y-6">
              <PopularTags />
              <NewsletterWidget />
              <SidebarAd />
              <TrendingTrailers />
              <SidebarAd />
              <TrendingSidebar />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
