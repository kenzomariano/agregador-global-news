import { Link } from "react-router-dom";
import { Tag, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, type Product } from "@/hooks/useProducts";

interface AffiliateProductsProps {
  category?: string;
  limit?: number;
  title?: string;
  compact?: boolean;
}

export function AffiliateProducts({
  category,
  limit = 6,
  title = "🔥 Ofertas do Dia",
  compact = false,
}: AffiliateProductsProps) {
  const { data: allProducts, isLoading } = useProducts(limit);

  const products = category && category !== "ofertas"
    ? allProducts?.filter((p) => p.category?.toLowerCase().includes(category.toLowerCase()))
    : allProducts;

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-serif flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-primary" />
          {title}
        </h2>
        <div className={compact ? "space-y-3" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"}>
          {Array.from({ length: compact ? 3 : limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) return null;

  if (compact) {
    return (
      <section className="space-y-3">
        <h3 className="font-bold font-serif flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {products.slice(0, 3).map((product) => (
          <CompactProductCard key={product.id} product={product} />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold font-serif flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary" />
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {products.slice(0, limit).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const storeName = product.news_sources?.name || "Loja";

  return (
    <Link to={`/produto/${product.slug}`} className="group block">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 p-2"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
          {product.category && (
            <Badge variant="outline" className="text-[10px] sm:text-xs mb-1.5 w-fit">
              {product.category}
            </Badge>
          )}
          <h3 className="text-sm sm:text-base font-medium group-hover:text-primary transition-colors leading-snug mb-auto">
            {product.name}
          </h3>
          <div className="mt-2">
            {product.price != null && (
              <p className="text-base sm:text-lg font-bold text-primary">
                {(product.currency || "R$")} {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{storeName}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CompactProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/produto/${product.slug}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
            <div className="flex items-center gap-2 text-xs">
              {product.price != null && (
                <span className="font-bold text-primary">
                  R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
              <span className="text-muted-foreground">{product.news_sources?.name || "Loja"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
