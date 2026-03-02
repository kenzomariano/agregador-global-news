import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShoppingBag, Search, ArrowUpDown, Filter } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { AffiliateProducts } from "@/components/products/AffiliateProducts";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const { data: products, isLoading } = useProducts();

  // Filter and sort products
  const filteredProducts = products
    ?.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return (a.price || 0) - (b.price || 0);
        case "price_desc":
          return (b.price || 0) - (a.price || 0);
        case "recent":
        default:
          return (
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
          );
      }
    });

  // Get unique categories
  const categories = Array.from(
    new Set(products?.map((p) => p.category).filter(Boolean))
  ) as string[];

  return (
    <>
      <SEOHead
        title="Produtos - DESIGNE"
        description="Confira os melhores produtos selecionados para você"
        keywords={["produtos", "ofertas", "compras", "e-commerce"]}
      />

      <div className="container py-6">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Produtos" },
        ]} />
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3 mb-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            Produtos
          </h1>
          <p className="text-muted-foreground">
            Confira os melhores produtos selecionados para você
          </p>
        </header>

        {/* Affiliate Highlights */}
        <div className="mb-8">
          <AffiliateProducts category="ofertas" limit={6} title="🛒 Ofertas em Destaque" />
        </div>

        <Separator className="my-8" />

        <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-primary" />
          Todos os Produtos
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-48">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="price_asc">Menor preço</SelectItem>
              <SelectItem value="price_desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h2>
            <p className="text-muted-foreground">
              {search
                ? "Tente ajustar sua busca ou filtros"
                : "Ainda não há produtos cadastrados"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  original_url: string;
  category: string | null;
  is_available: boolean | null;
  created_at: string | null;
  news_sources?: {
    name: string;
    logo_url: string | null;
  } | null;
}

function ProductCard({ product }: { product: Product }) {
  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(price);
  };

  const timeAgo = product.created_at
    ? formatDistanceToNow(new Date(product.created_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <Link to={`/produto/${product.slug}`}>
      <Card className="overflow-hidden group hover:shadow-lg transition-shadow flex flex-col h-full">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          {product.is_available === false && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                Indisponível
              </Badge>
            </div>
          )}
          {product.category && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 text-xs"
            >
              {product.category}
            </Badge>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
          <div className="mt-auto">
            {product.price !== null && (
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(product.price, product.currency)}
                </p>
              </div>
            )}
          </div>
          {timeAgo && (
            <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
          )}
          {product.news_sources?.name && (
            <p className="text-xs text-muted-foreground mt-1">
              via {product.news_sources.name}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
