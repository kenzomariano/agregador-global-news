import { useState } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useAdPlacements,
  useCreateAdPlacement,
  useUpdateAdPlacement,
  useDeleteAdPlacement,
  type AdPlacement,
} from "@/hooks/useAdPlacements";

const POSITIONS = [
  { value: "sidebar", label: "Sidebar" },
  { value: "header", label: "Cabeçalho" },
  { value: "article-inline", label: "Dentro do Artigo" },
  { value: "between-sections", label: "Entre Seções" },
  { value: "footer", label: "Rodapé" },
];

const AD_TYPES = [
  { value: "adsense", label: "Google AdSense" },
  { value: "banner", label: "Banner Personalizado" },
];

export function AdsManager() {
  const { toast } = useToast();
  const { data: ads, isLoading } = useAdPlacements();
  const createAd = useCreateAdPlacement();
  const updateAd = useUpdateAdPlacement();
  const deleteAd = useDeleteAdPlacement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [form, setForm] = useState({
    name: "",
    slot_id: "",
    position: "sidebar",
    ad_type: "adsense",
    banner_url: "",
    banner_link: "",
    banner_image: "",
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      name: "",
      slot_id: "",
      position: "sidebar",
      ad_type: "adsense",
      banner_url: "",
      banner_link: "",
      banner_image: "",
      is_active: true,
    });
    setEditingAd(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (ad: AdPlacement) => {
    setEditingAd(ad);
    setForm({
      name: ad.name,
      slot_id: ad.slot_id,
      position: ad.position,
      ad_type: ad.ad_type,
      banner_url: ad.banner_url || "",
      banner_link: ad.banner_link || "",
      banner_image: ad.banner_image || "",
      is_active: ad.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slot_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o ID do slot.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAd) {
        await updateAd.mutateAsync({ id: editingAd.id, ...form });
        toast({ title: "Anúncio atualizado!" });
      } else {
        await createAd.mutateAsync(form);
        toast({ title: "Anúncio criado!" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (ad: AdPlacement) => {
    try {
      await updateAd.mutateAsync({ id: ad.id, is_active: !ad.is_active });
      toast({
        title: ad.is_active ? "Anúncio desativado" : "Anúncio ativado",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAd.mutateAsync(id);
      toast({ title: "Anúncio excluído!" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPositionLabel = (position: string) =>
    POSITIONS.find((p) => p.value === position)?.label || position;

  const getTypeLabel = (type: string) =>
    AD_TYPES.find((t) => t.value === type)?.label || type;

  if (isLoading) {
    return <div className="text-center py-8">Carregando anúncios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gerenciar Anúncios</h2>
          <p className="text-sm text-muted-foreground">
            Configure os espaços publicitários do site
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Anúncio
        </Button>
      </div>

      {ads && ads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {ads.map((ad) => (
            <Card key={ad.id} className={!ad.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{ad.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{getPositionLabel(ad.position)}</Badge>
                      <Badge variant="secondary">{getTypeLabel(ad.ad_type)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(ad)}
                      title={ad.is_active ? "Desativar" : "Ativar"}
                    >
                      {ad.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(ad)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(ad.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Slot ID: <code className="bg-muted px-1 rounded">{ad.slot_id}</code>
                </p>
                {ad.ad_type === "banner" && ad.banner_image && (
                  <img
                    src={ad.banner_image}
                    alt={ad.name}
                    className="mt-2 rounded h-16 object-cover"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum anúncio cadastrado. Clique em "Novo Anúncio" para começar.
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Editar Anúncio" : "Novo Anúncio"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do espaço publicitário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Anúncio</Label>
              <Input
                id="name"
                placeholder="Ex: Banner Sidebar Principal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posição</Label>
                <Select
                  value={form.position}
                  onValueChange={(value) => setForm({ ...form, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.ad_type}
                  onValueChange={(value) => setForm({ ...form, ad_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot_id">
                {form.ad_type === "adsense" ? "ID do Slot AdSense" : "ID do Banner"}
              </Label>
              <Input
                id="slot_id"
                placeholder={form.ad_type === "adsense" ? "1234567890" : "banner-01"}
                value={form.slot_id}
                onChange={(e) => setForm({ ...form, slot_id: e.target.value })}
              />
            </div>

            {form.ad_type === "banner" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="banner_image">URL da Imagem</Label>
                  <Input
                    id="banner_image"
                    type="url"
                    placeholder="https://..."
                    value={form.banner_image}
                    onChange={(e) => setForm({ ...form, banner_image: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner_link">Link de Destino</Label>
                  <Input
                    id="banner_link"
                    type="url"
                    placeholder="https://..."
                    value={form.banner_link}
                    onChange={(e) => setForm({ ...form, banner_link: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Anúncio ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingAd ? "Salvar Alterações" : "Criar Anúncio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
