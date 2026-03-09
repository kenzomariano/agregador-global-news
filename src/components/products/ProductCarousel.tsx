import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  news_sources?: { name: string; logo_url: string | null } | null;
}

interface ProductCarouselProps {
  products: ProductItem[];
  title: string;
}

export function ProductCarousel({ products, title }: ProductCarouselProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold font-serif flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary" />
        {title}
      </h2>
      <Carousel
        opts={{ align: "start", loop: products.length > 3 }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {products.map((product) => (
            <CarouselItem key={product.id} className="pl-3 basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Link to={`/produto/${product.slug}`} className="block h-full">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 flex-1">
                    <p className="text-sm font-medium line-clamp-2 mb-1">{product.name}</p>
                    {product.price !== null && (
                      <p className="text-lg font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: product.currency || "BRL",
                        }).format(product.price)}
                      </p>
                    )}
                    {product.news_sources?.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        via {product.news_sources.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-4" />
        <CarouselNext className="hidden sm:flex -right-4" />
      </Carousel>
    </section>
  );
}
