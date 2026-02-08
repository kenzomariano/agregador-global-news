import { ExternalLink, Tag, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAffiliateProducts, type AffiliateProduct } from "@/hooks/useAffiliateProducts";

interface AffiliateProductsProps {
  category?: string;
  limit?: number;
  title?: string;
  compact?: boolean;
}

export function AffiliateProducts({
  category = "ofertas",
  limit = 6,
  title = "🔥 Ofertas do Dia",
  compact = false,
}: AffiliateProductsProps) {
  const { data: products, isLoading } = useAffiliateProducts(category, limit);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-serif flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-primary" />
          {title}
        </h2>
        <div className={compact ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
          {Array.from({ length: compact ? 3 : limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
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
        {products.slice(0, 3).map((product, i) => (
          <CompactProductCard key={i} product={product} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, i) => (
          <ProductCard key={i} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: AffiliateProduct }) {
  const storeName = product.store === "mercadolivre" ? "Mercado Livre" : "Shopee";
  const storeColor = product.store === "mercadolivre" ? "bg-yellow-500" : "bg-orange-500";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      <CardContent className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="destructive" className="text-xs">
            -{product.discount_percent}%
          </Badge>
          <Badge variant="outline" className="text-xs">
            {storeName}
          </Badge>
        </div>

        <h3 className="font-medium line-clamp-2 mb-2">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {product.description}
        </p>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground line-through">
            R$ {product.price.toFixed(2)}
          </p>
          <p className="text-lg font-bold text-primary">
            R$ {product.sale_price.toFixed(2)}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild variant="default" size="sm" className="w-full">
          <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver no {storeName}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CompactProductCard({ product }: { product: AffiliateProduct }) {
  const storeName = product.store === "mercadolivre" ? "ML" : "Shopee";

  return (
    <a
      href={product.affiliate_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="block"
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground line-through">
                R$ {product.price.toFixed(2)}
              </span>
              <span className="font-bold text-primary">
                R$ {product.sale_price.toFixed(2)}
              </span>
              <Badge variant="outline" className="text-[10px] px-1">
                {storeName}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
