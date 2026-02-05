import { SEOHead } from "@/components/seo/SEOHead";
import { FeaturedSection } from "@/components/news/FeaturedSection";
import { CategorySection } from "@/components/news/CategorySection";
import { TrendingSidebar } from "@/components/news/TrendingSidebar";
import { TrendingMovies } from "@/components/entertainment/TrendingMovies";
import { TrendingTrailers } from "@/components/entertainment/TrendingTrailers";
import { PopularTags } from "@/components/news/PopularTags";
import { HorizontalAd, SidebarAd } from "@/components/ads/AdBanner";
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

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content */}
          <div className="lg:col-span-8 xl:col-span-9">
            <FeaturedSection />
            
            {/* Ad Banner after featured */}
            <HorizontalAd />
            
            {/* Entertainment section with TMDB */}
            <TrendingMovies />
            
            {MAIN_CATEGORIES.map((category, index) => (
              <div key={category}>
                <CategorySection category={category} />
                {/* Show ad after every 2 categories */}
                {(index + 1) % 2 === 0 && index < MAIN_CATEGORIES.length - 1 && (
                  <HorizontalAd />
                )}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-32 space-y-6">
              <PopularTags />
              {/* Sidebar Ad */}
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
