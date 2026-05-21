import { useEffect, useState } from "react";
import { Plus, Save, Trash2, GripVertical, Loader2, ArrowUp, ArrowDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useGuidesMenuConfig,
  useGuideCategoryCounts,
  type CustomMenuLink,
  type GuidesMenuConfig,
} from "@/hooks/useMenuVisibility";
import { isSafeUrl } from "@/lib/sanitizeHtml";

const DEFAULT_GUIDE_CATEGORIES = [
  { key: "geral", label: "Geral", emoji: "📚" },
  { key: "tecnologia", label: "Tecnologia", emoji: "💻" },
  { key: "receitas", label: "Receitas", emoji: "🍳" },
  { key: "culinaria", label: "Culinária", emoji: "👨‍🍳" },
  { key: "saude", label: "Saúde", emoji: "💪" },
  { key: "financas", label: "Finanças", emoji: "💰" },
  { key: "viagem", label: "Viagem", emoji: "✈️" },
  { key: "diy", label: "Faça você mesmo", emoji: "🔧" },
  { key: "estudos", label: "Estudos", emoji: "🎓" },
  { key: "estilo-vida", label: "Estilo de vida", emoji: "🌿" },
];

export function GuidesMenuBuilder() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: cfg } = useGuidesMenuConfig();
  const { data: counts } = useGuideCategoryCounts();
  const [form, setForm] = useState<GuidesMenuConfig>({
    showCategoriesSidebar: true,
    hideEmptyCategories: true,
    hiddenCategories: [],
    customLinks: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (cfg) setForm(cfg); }, [cfg]);

  const toggleCategory = (key: string) => {
    setForm((f) => {
      const hidden = new Set(f.hiddenCategories);
      hidden.has(key) ? hidden.delete(key) : hidden.add(key);
      return { ...f, hiddenCategories: Array.from(hidden) };
    });
  };

  const addLink = () => setForm((f) => ({
    ...f,
    customLinks: [...f.customLinks, { label: "", url: "", emoji: "" }],
  }));

  const updateLink = (i: number, field: keyof CustomMenuLink, value: string) =>
    setForm((f) => ({
      ...f,
      customLinks: f.customLinks.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));

  const removeLink = (i: number) =>
    setForm((f) => ({ ...f, customLinks: f.customLinks.filter((_, idx) => idx !== i) }));

  const moveLink = (i: number, dir: -1 | 1) => {
    setForm((f) => {
      const arr = [...f.customLinks];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, customLinks: arr };
    });
  };

  const handleSave = async () => {
    // Validate URLs
    const bad = form.customLinks.find((l) => l.url && !isSafeUrl(l.url));
    if (bad) {
      toast({ title: "URL inválida", description: bad.url, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "guides_menu_config", value: JSON.stringify(form) }, { onConflict: "key" });
      if (error) throw error;
      toast({ title: "Menu de guias salvo!" });
      qc.invalidateQueries({ queryKey: ["guides-menu-config"] });
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Menu de Guias
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure categorias, subcategorias e links da página de guias.
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
            <CardTitle className="text-lg">Exibição</CardTitle>
            <CardDescription>Comportamento da sidebar de categorias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar sidebar de categorias</Label>
                <p className="text-xs text-muted-foreground">Exibe filtro por categoria na página /guias</p>
              </div>
              <Switch
                checked={form.showCategoriesSidebar}
                onCheckedChange={(v) => setForm({ ...form, showCategoriesSidebar: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Esconder categorias vazias</Label>
                <p className="text-xs text-muted-foreground">Oculta categorias sem nenhum guia publicado</p>
              </div>
              <Switch
                checked={form.hideEmptyCategories}
                onCheckedChange={(v) => setForm({ ...form, hideEmptyCategories: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categorias</CardTitle>
            <CardDescription>
              Categorias visíveis na sidebar. Número = guias publicados.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_GUIDE_CATEGORIES.map((c) => {
              const visible = !form.hiddenCategories.includes(c.key);
              const count = counts?.[c.key] ?? 0;
              return (
                <label key={c.key} className="flex items-center justify-between gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                  <span className="text-sm flex items-center gap-2">
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </span>
                  <Switch checked={visible} onCheckedChange={() => toggleCategory(c.key)} />
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
                <CardDescription>Atalhos extras na página de guias</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1" /> Novo link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.customLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Sem links personalizados.
              </p>
            ) : form.customLinks.map((link, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground self-center" />
                <div className="space-y-1 w-20">
                  <Label className="text-xs">Emoji</Label>
                  <Input value={link.emoji || ""} onChange={(e) => updateLink(i, "emoji", e.target.value)} maxLength={3} placeholder="📘" />
                </div>
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <Label className="text-xs">Rótulo</Label>
                  <Input value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} placeholder="Receitas veganas" />
                </div>
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <Label className="text-xs">URL</Label>
                  <Input value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="/guias?cat=receitas" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveLink(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveLink(i, 1)} disabled={i === form.customLinks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLink(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { DEFAULT_GUIDE_CATEGORIES };
