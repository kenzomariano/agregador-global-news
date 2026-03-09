import { Link } from "react-router-dom";
import { ShoppingBag, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/hooks/useProducts";

interface SidebarProductsProps {
  category?: string;
  limit?: number;
  title?: string;
  excludeId?: string;
}

export function SidebarProducts({
  category,
  limit = 3,
  title = "Ofertas Relacionadas",
  excludeId,
}: SidebarProductsProps) {
  const { data: products, isLoading } = useProducts(20);

  const filtered = products
    ?.filter((p) => p.id !== excludeId)
    ?.filter((p) => !category || p.category === category || !p.category)
    .slice(0, limit);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h3 className="font-bold font-serif flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {Array.from({ length: limit }).map((_, i) => (
          <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </section>
    );
  }

  if (!filtered || filtered.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="font-bold font-serif flex items-center gap-2">
        <Tag className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {filtered.map((product) => (
        <Link key={product.id} to={`/produto/${product.slug}`} className="block">
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                <div className="flex items-center gap-2 text-xs">
                  {product.price !== null && (
                    <span className="font-bold text-primary">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: product.currency || "BRL" }).format(product.price)}
                    </span>
                  )}
                  {product.news_sources?.name && (
                    <Badge variant="outline" className="text-[10px] px-1">
                      {product.news_sources.name}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}
