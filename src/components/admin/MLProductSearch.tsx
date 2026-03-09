import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, ShoppingCart, X, Check, Package, Filter, ChevronDown, Truck } from "lucide-react";

interface MLResult {
  ml_id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency: string;
  thumbnail: string | null;
  permalink: string;
  condition: string;
  available_quantity: number;
  sold_quantity: number;
  category_id: string;
  seller_nickname: string | null;
  shipping_free: boolean;
}

interface MLCategory {
  id: string;
  name: string;
}

interface MLProductSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ML_CATEGORIES: MLCategory[] = [
  { id: "", name: "Todas as categorias" },
  { id: "MLB1648", name: "Computação" },
  { id: "MLB1051", name: "Celulares e Telefones" },
  { id: "MLB1000", name: "Eletrônicos, Áudio e Vídeo" },
  { id: "MLB1574", name: "Casa, Móveis e Decoração" },
  { id: "MLB1276", name: "Esportes e Fitness" },
  { id: "MLB1168", name: "Brinquedos e Hobbies" },
  { id: "MLB1430", name: "Beleza e Cuidado Pessoal" },
];

export function MLProductSearch({ open, onOpenChange }: MLProductSearchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MLResult[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [category, setCategory] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [condition, setCondition] = useState("");

  const handleSearch = async (offset = 0) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const body: Record<string, any> = { 
        query: query.trim(), 
        limit: 20, 
        offset 
      };
      if (category) body.category = category;
      if (priceMin) body.priceMin = parseFloat(priceMin);
      if (priceMax) body.priceMax = parseFloat(priceMax);
      if (condition) body.condition = condition;

      const { data, error } = await supabase.functions.invoke("ml-search-products", {
        body,
      });
      if (error) throw error;
      if (offset === 0) {
        setResults(data.results);
        setSelectedIds(new Set());
      } else {
        setResults((prev) => [...prev, ...data.results]);
      }
      setTotal(data.total);
    } catch (e: any) {
      toast({ title: "Erro na busca", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = () => {
    setCategory("");
    setPriceMin("");
    setPriceMax("");
    setCondition("");
  };

  const hasActiveFilters = category || priceMin || priceMax || condition;

  const importMutation = useMutation({
    mutationFn: async (items: MLResult[]) => {
      const products = items.map((item) => {
        const slug = item.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 60) + "-" + Date.now().toString(36);
        return {
          name: item.title,
          slug,
          original_url: item.permalink,
          price: item.price,
          currency: item.currency === "BRL" ? "BRL" : item.currency,
          image_url: item.thumbnail,
          is_available: item.available_quantity > 0,
          category: "mercado-livre",
        };
      });

      const { error } = await supabase.from("products").insert(products);
      if (error) throw error;
      return products.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      toast({ title: `${count} produto(s) importados com sucesso!` });
    },
    onError: (e: any) => toast({ title: "Erro ao importar", description: e.message, variant: "destructive" }),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.ml_id)));
    }
  };

  const handleImport = () => {
    const selected = results.filter((r) => selectedIds.has(r.ml_id));
    if (selected.length === 0) return;
    importMutation.mutate(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Buscar Produtos no Mercado Livre
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: notebook gamer, fone bluetooth..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>

          {/* Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">Ativos</Badge>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      {ML_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id || "all"}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Condição</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="used">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Min */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Preço mínimo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Price Max */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Preço máximo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="h-9"
                  />
                </div>

                {hasActiveFilters && (
                  <div className="col-span-2">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                      <X className="h-3 w-3 mr-1" /> Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
            <Badge variant="secondary">{selectedIds.size} selecionado(s)</Badge>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importMutation.isPending} className="ml-auto">
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Importar {selectedIds.size} produto(s)
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {results.length === 0 && !searching && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Pesquise produtos do Mercado Livre para importar</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center gap-2 py-1">
              <Checkbox
                checked={results.length > 0 && selectedIds.size === results.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {total.toLocaleString("pt-BR")} resultado(s) encontrado(s)
              </span>
            </div>
          )}

          {results.map((item) => (
            <Card
              key={item.ml_id}
              className={`cursor-pointer transition-colors ${
                selectedIds.has(item.ml_id) ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => toggleSelect(item.ml_id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(item.ml_id)}
                    onCheckedChange={() => toggleSelect(item.ml_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-14 h-14 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        R$ {item.price?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </Badge>
                      {item.original_price && item.original_price > item.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          R$ {item.original_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.condition === "new" ? "Novo" : "Usado"}
                      </span>
                      {item.shipping_free && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                          <Truck className="h-3 w-3 mr-1" /> Frete grátis
                        </Badge>
                      )}
                      {item.sold_quantity > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {item.sold_quantity} vendido(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {results.length > 0 && results.length < total && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSearch(results.length)}
              disabled={searching}
            >
              {searching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Carregar mais
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
