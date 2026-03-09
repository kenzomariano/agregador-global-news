import { Link, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, ShoppingBag, ArrowLeft, Tag, Store, Clock, CheckCircle, XCircle } from "lucide-react";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { useProductBySlug, useProducts } from "@/hooks/useProducts";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProductBySlug(slug || "");
  const { data: allProducts } = useProducts(20);

  // Related products from same category
  const relatedProducts = allProducts
    ?.filter((p) => p.id !== product?.id && p.category === product?.category)
    .slice(0, 4);

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="container py-6 max-w-5xl">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-12 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6">O produto solicitado não existe ou foi removido.</p>
        <Button asChild>
          <Link to="/produtos">Ver todos os produtos</Link>
        </Button>
      </div>
    );
  }

  const timeAgo = product.created_at
    ? formatDistanceToNow(new Date(product.created_at), { addSuffix: true, locale: ptBR })
    : null;

  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    image: product.image_url || undefined,
    ...(product.price !== null && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: product.currency || "BRL",
        availability: product.is_available !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: product.original_url,
      },
    }),
  };

  return (
    <>
      <SEOHead
        title={product.name}
        description={product.description || `Confira ${product.name} com o melhor preço`}
        image={product.image_url || undefined}
        keywords={[product.name, product.category || "produtos", "oferta", "promoção"]}
      />

      <div className="container py-6 max-w-5xl">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Produtos", href: "/produtos" },
          { label: product.name },
        ]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted border">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
            {product.is_available === false && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Badge variant="secondary" className="text-lg px-4 py-2">Indisponível</Badge>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {product.category && (
              <Badge variant="outline" className="w-fit mb-3">
                <Tag className="h-3 w-3 mr-1" />
                {product.category}
              </Badge>
            )}

            <h1 className="text-2xl md:text-3xl font-bold font-serif mb-4">{product.name}</h1>

            {product.description && (
              <p className="text-muted-foreground mb-6 leading-relaxed">{product.description}</p>
            )}

            {/* Price highlight */}
            {product.price !== null && (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Preço</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatPrice(product.price, product.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {product.currency || "BRL"} · Preço sujeito a alteração
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Availability */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              {product.is_available !== false ? (
                <>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">Disponível</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">Indisponível</span>
                </>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-sm text-muted-foreground mb-6">
              {product.news_sources?.name && (
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span>via {product.news_sources.name}</span>
                </div>
              )}
              {timeAgo && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Adicionado {timeAgo}</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <Button asChild size="lg" className="w-full text-lg py-6">
              <a href={product.original_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5 mr-2" />
                Ver Produto na Loja
              </a>
            </Button>

            <Button asChild variant="outline" size="sm" className="w-full mt-3">
              <Link to="/produtos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para produtos
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Related products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-primary" />
              Produtos Similares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link key={p.id} to={`/produto/${p.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                      {p.price !== null && (
                        <p className="text-lg font-bold text-primary mt-1">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: p.currency || "BRL" }).format(p.price)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* JSON-LD for product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
    </>
  );
}
