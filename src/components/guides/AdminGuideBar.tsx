import { useState } from "react";
import { Pencil, Settings2, CheckCircle2, EyeOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Guide } from "@/hooks/useGuides";

export function AdminGuideBar({ guide }: { guide: Guide }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  const togglePublish = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("guides").update({
        is_published: !guide.is_published,
        ...(!guide.is_published && !guide.published_at ? { published_at: new Date().toISOString() } : {}),
      }).eq("id", guide.id);
      if (error) throw error;
      toast({ title: guide.is_published ? "Guia despublicado" : "Guia publicado!" });
      qc.invalidateQueries({ queryKey: ["guide", guide.slug] });
      qc.invalidateQueries({ queryKey: ["guides"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("guides").delete().eq("id", guide.id);
      if (error) throw error;
      toast({ title: "Guia apagado" });
      qc.invalidateQueries({ queryKey: ["guides"] });
      navigate("/guias");
    } catch (e: any) {
      toast({ title: "Erro ao apagar", description: e.message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-primary mr-2">
        <Settings2 className="h-3.5 w-3.5" /> Admin
      </span>
      <Button size="sm" variant="outline" onClick={() => navigate(`/admin?tab=guides&edit=${guide.id}`)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
      </Button>
      <Button
        size="sm"
        variant={guide.is_published ? "outline" : "default"}
        onClick={togglePublish}
        disabled={busy}
      >
        {guide.is_published ? (
          <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Despublicar</>
        ) : (
          <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Publicar</>
        )}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={busy}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Apagar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este guia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O guia "{guide.title}" será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
