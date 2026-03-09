import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Trash2, ExternalLink, Loader2, Plus, Package, EyeOff, X, Link2, ImagePlus, RefreshCw } from "lucide-react";

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
}

export function ProductsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto excluído!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (product: Partial<Product> & { id: string }) => {
      const { id, ...updates } = product;
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditProduct(null);
      toast({ title: "Produto atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (product: { name: string; slug: string; original_url: string; description?: string; price?: number; currency?: string; image_url?: string; category?: string }) => {
      const { error } = await supabase.from("products").insert(product);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsCreateOpen(false);
      toast({ title: "Produto criado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} produto(s) excluído(s)!` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const bulkUnavailableMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").update({ is_available: false }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} produto(s) marcado(s) como indisponível!` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const bulkActing = bulkDeleteMutation.isPending || bulkUnavailableMutation.isPending;

  const [enriching, setEnriching] = useState(false);

  const mlProductsCount = products?.filter(p => p.original_url.includes("mercadolivre.com.br")).length || 0;
  const mlMissingData = products?.filter(p => p.original_url.includes("mercadolivre.com.br") && (!p.image_url || p.price === null)).length || 0;

  const handleMLConnect = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    window.open(`${supabaseUrl}/functions/v1/ml-oauth-callback`, "_blank");
  };

  const handleEnrichProducts = async () => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-enrich-products");
      if (error) throw error;
      toast({
        title: "Enriquecimento concluído",
        description: `${data.enriched}/${data.total} produto(s) atualizados com imagens e preços do Mercado Livre.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes("401") || msg.includes("token not available")) {
        toast({
          title: "Autenticação necessária",
          description: "Conecte sua conta do Mercado Livre primeiro usando o botão acima.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro", description: msg, variant: "destructive" });
      }
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ML Integration Section */}
      {mlProductsCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ImagePlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Integração Mercado Livre</h3>
                  <p className="text-xs text-muted-foreground">
                    {mlMissingData > 0
                      ? `${mlMissingData} produto(s) do ML sem imagem ou preço`
                      : "Todos os produtos do ML estão completos"
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleMLConnect}>
                  <Link2 className="h-4 w-4 mr-1" />
                  Conectar ML
                </Button>
                {mlMissingData > 0 && (
                  <Button size="sm" onClick={handleEnrichProducts} disabled={enriching}>
                    {enriching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Buscar Dados
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum produto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">{filtered.length} produto(s)</span>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary">{selectedIds.size} selecionado(s)</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActing}
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActing}
                  onClick={() => {
                    if (confirm(`Marcar ${selectedIds.size} produto(s) como indisponível?`)) {
                      bulkUnavailableMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                >
                  {bulkUnavailableMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  Indisponível
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkActing}
                  onClick={() => {
                    if (confirm(`Excluir ${selectedIds.size} produto(s)? Esta ação não pode ser desfeita.`)) {
                      bulkDeleteMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                >
                  {bulkDeleteMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Excluir
                </Button>
              </div>
            )}
          </div>

          {filtered.map((product) => (
            <Card key={product.id} className={`overflow-hidden transition-colors ${selectedIds.has(product.id) ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleSelect(product.id)}
                    className="mt-1"
                  />
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {product.price != null && (
                        <Badge variant="secondary">
                          {product.currency || "R$"} {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                      {product.category && (
                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      )}
                      <Badge variant={product.is_available ? "default" : "destructive"} className="text-xs">
                        {product.is_available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={product.original_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Excluir este produto?")) deleteMutation.mutate(product.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <ProductEditDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        onSave={(updates) => {
          if (editProduct) updateMutation.mutate({ id: editProduct.id, ...updates });
        }}
        saving={updateMutation.isPending}
      />

      {/* Create Dialog */}
      <ProductCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />
    </div>
  );
}

function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Product>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [imageUrl, setImageUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  // Sync state when product changes
  useState(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price?.toString() || "");
      setCurrency(product.currency || "BRL");
      setImageUrl(product.image_url || "");
      setOriginalUrl(product.original_url);
      setCategory(product.category || "");
      setIsAvailable(product.is_available ?? true);
    }
  });

  // Reset when product changes
  const currentId = product?.id;
  useState(() => undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        {product && (
          <ProductForm
            name={product.name}
            description={product.description || ""}
            price={product.price?.toString() || ""}
            currency={product.currency || "BRL"}
            imageUrl={product.image_url || ""}
            originalUrl={product.original_url}
            category={product.category || ""}
            isAvailable={product.is_available ?? true}
            saving={saving}
            submitLabel="Salvar Alterações"
            onSubmit={(data) => onSave({
              name: data.name,
              description: data.description || null,
              price: data.price ? parseFloat(data.price) : null,
              currency: data.currency,
              image_url: data.imageUrl || null,
              original_url: data.originalUrl,
              category: data.category || null,
              is_available: data.isAvailable,
            })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductCreateDialog({
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; slug: string; original_url: string; description?: string; price?: number; currency?: string; image_url?: string; category?: string }) => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        <ProductForm
          name=""
          description=""
          price=""
          currency="BRL"
          imageUrl=""
          originalUrl=""
          category=""
          isAvailable={true}
          saving={saving}
          submitLabel="Criar Produto"
          onSubmit={(data) => {
            const slug = data.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              + "-" + Date.now().toString(36);
            onSave({
              name: data.name,
              slug,
              original_url: data.originalUrl,
              description: data.description || undefined,
              price: data.price ? parseFloat(data.price) : undefined,
              currency: data.currency || undefined,
              image_url: data.imageUrl || undefined,
              category: data.category || undefined,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  name: initName,
  description: initDesc,
  price: initPrice,
  currency: initCurrency,
  imageUrl: initImage,
  originalUrl: initUrl,
  category: initCategory,
  isAvailable: initAvailable,
  saving,
  submitLabel,
  onSubmit,
}: {
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  originalUrl: string;
  category: string;
  isAvailable: boolean;
  saving: boolean;
  submitLabel: string;
  onSubmit: (data: { name: string; description: string; price: string; currency: string; imageUrl: string; originalUrl: string; category: string; isAvailable: boolean }) => void;
}) {
  const [name, setName] = useState(initName);
  const [description, setDescription] = useState(initDesc);
  const [price, setPrice] = useState(initPrice);
  const [currency, setCurrency] = useState(initCurrency);
  const [imageUrl, setImageUrl] = useState(initImage);
  const [originalUrl, setOriginalUrl] = useState(initUrl);
  const [category, setCategory] = useState(initCategory);
  const [isAvailable, setIsAvailable] = useState(initAvailable);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Preço</Label>
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Moeda</Label>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="BRL" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>URL Original *</Label>
        <Input value={originalUrl} onChange={(e) => setOriginalUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: tecnologia" />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        <Label>Disponível</Label>
      </div>
      <Button
        className="w-full"
        disabled={saving || !name || !originalUrl}
        onClick={() => onSubmit({ name, description, price, currency, imageUrl, originalUrl, category, isAvailable })}
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}
