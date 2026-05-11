import { useEffect, useState } from "react";
import { Plus, Save, Trash2, GripVertical, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMenuConfig, type CustomMenuLink, type MenuConfig } from "@/hooks/useMenuVisibility";
import { CATEGORIES, ENTERTAINMENT_SUBCATEGORIES } from "@/lib/categories";

const ALL_CATEGORIES = Object.keys(CATEGORIES);

const PAGES = [
  { url: "/", label: "Início" },
  { url: "/mais-lidas", label: "Mais Lidas" },
  { url: "/produtos", label: "Produtos" },
  { url: "/guias", label: "Guias" },
  { url: "/buscar", label: "Buscar" },
  { url: "/newsletter", label: "Newsletter" },
];

export function MenuBuilder() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: cfg } = useMenuConfig();
  const [form, setForm] = useState<MenuConfig>({
    showProducts: true,
    showGuides: true,
    showTrending: true,
    customLinks: [],
    hiddenCategories: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  const toggleCategory = (key: string) => {
    setForm((f) => {
      const hidden = new Set(f.hiddenCategories);
      hidden.has(key) ? hidden.delete(key) : hidden.add(key);
      return { ...f, hiddenCategories: Array.from(hidden) };
    });
  };

  const addLink = () => {
    setForm((f) => ({
      ...f,
      customLinks: [...f.customLinks, { label: "", url: "", emoji: "" }],
    }));
  };

  const updateLink = (i: number, field: keyof CustomMenuLink, value: string) => {
    setForm((f) => ({
      ...f,
      customLinks: f.customLinks.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));
  };

  const removeLink = (i: number) => {
    setForm((f) => ({ ...f, customLinks: f.customLinks.filter((_, idx) => idx !== i) }));
  };

  const moveLink = (i: number, dir: -1 | 1) => {
    setForm((f) => {
      const arr = [...f.customLinks];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, customLinks: arr };
    });
  };

  const addPageLink = (url: string, label: string) => {
    if (form.customLinks.some((l) => l.url === url)) return;
    setForm((f) => ({ ...f, customLinks: [...f.customLinks, { label, url, emoji: "📄" }] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "menu_config", value: JSON.stringify(form) }, { onConflict: "key" });
      if (error) throw error;
      toast({ title: "Menu salvo!", description: "As alterações já estão no ar." });
      qc.invalidateQueries({ queryKey: ["menu-config"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Builder do Menu</h2>
          <p className="text-sm text-muted-foreground">
            Controle o que aparece no menu principal: categorias, páginas e links personalizados.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Páginas padrão</CardTitle>
            <CardDescription>Mostre ou esconda as páginas internas no menu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mais Lidas</Label>
                <p className="text-xs text-muted-foreground">Atalho para a página de trending</p>
              </div>
              <Switch
                checked={form.showTrending}
                onCheckedChange={(v) => setForm({ ...form, showTrending: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Produtos</Label>
                <p className="text-xs text-muted-foreground">
                  Esconde mesmo que existam produtos cadastrados
                </p>
              </div>
              <Switch
                checked={form.showProducts}
                onCheckedChange={(v) => setForm({ ...form, showProducts: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Guias</Label>
                <p className="text-xs text-muted-foreground">
                  Esconde mesmo que existam guias publicados
                </p>
              </div>
              <Switch
                checked={form.showGuides}
                onCheckedChange={(v) => setForm({ ...form, showGuides: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categorias</CardTitle>
            <CardDescription>Esconde a categoria do menu (artigos continuam acessíveis)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {ALL_CATEGORIES.map((key) => {
              const cat = CATEGORIES[key as keyof typeof CATEGORIES];
              const visible = !form.hiddenCategories.includes(key);
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                >
                  <span className="text-sm">{cat.label}</span>
                  <Switch checked={visible} onCheckedChange={() => toggleCategory(key)} />
                </label>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Links personalizados</CardTitle>
                <CardDescription>
                  Adicione URLs internas (ex.: /categoria/entretenimento/anime) ou externas
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1" /> Novo link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 pb-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Atalhos:</span>
              {PAGES.map((p) => (
                <Button
                  key={p.url}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addPageLink(p.url, p.label)}
                >
                  + {p.label}
                </Button>
              ))}
              {Object.entries(ENTERTAINMENT_SUBCATEGORIES).map(([key, sc]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addPageLink(`/categoria/entretenimento/${key}`, sc.label)}
                >
                  + {sc.icon} {sc.label}
                </Button>
              ))}
            </div>

            {form.customLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum link personalizado. Use os atalhos acima ou clique em "Novo link".
              </p>
            ) : (
              form.customLinks.map((link, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground self-center" />
                  <div className="space-y-1 flex-shrink-0 w-20">
                    <Label className="text-xs">Emoji</Label>
                    <Input
                      value={link.emoji || ""}
                      onChange={(e) => updateLink(i, "emoji", e.target.value)}
                      placeholder="🎬"
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[140px]">
                    <Label className="text-xs">Rótulo</Label>
                    <Input
                      value={link.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                      placeholder="Animes"
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(i, "url", e.target.value)}
                      placeholder="/categoria/entretenimento ou https://..."
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveLink(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveLink(i, 1)} disabled={i === form.customLinks.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLink(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
