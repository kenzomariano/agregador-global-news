import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticles, type Article } from "@/hooks/useArticles";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { ArticleCard } from "./ArticleCard";

interface CategorySectionProps {
  category: CategoryKey;
  limit?: number;
}

export function CategorySection({ category, limit = 4 }: CategorySectionProps) {
  const { data, isLoading } = useArticles(category, limit);
  const articles = data?.articles;
  const categoryInfo = CATEGORIES[category];

  if (isLoading) {
    return (
      <section className="py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-40" />
          <Skeleton className="h-4 w-16 sm:w-20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="space-y-2 sm:space-y-3">
              <Skeleton className="aspect-[4/3] sm:aspect-[16/10] w-full rounded-lg" />
              <Skeleton className="h-3 sm:h-4 w-full" />
              <Skeleton className="h-3 sm:h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="py-6 sm:py-8 border-t first:border-0 first:pt-0">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold font-serif flex items-center gap-2">
          <span className={`w-1 h-5 sm:h-6 rounded-full bg-primary`} />
          {categoryInfo.label}
        </h2>
        <Link
          to={`/categoria/${category}`}
          className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-0.5 sm:gap-1"
        >
          Ver mais
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
