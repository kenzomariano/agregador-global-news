import { Trash2, RefreshCw, Star, StarOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ArticleBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkRescrape: () => void;
  onBulkFeature: (featured: boolean) => void;
  isDeleting: boolean;
  isRescraping: boolean;
}

export function ArticleBulkActions({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkRescrape,
  onBulkFeature,
  isDeleting,
  isRescraping,
}: ArticleBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
      <span className="font-medium text-sm">
        {selectedCount} artigo(s) selecionado(s)
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="ml-auto sm:ml-0"
      >
        <X className="h-4 w-4 mr-1" />
        Limpar
      </Button>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkRescrape}
          disabled={isRescraping}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRescraping ? "animate-spin" : ""}`} />
          Atualizar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkFeature(true)}
        >
          <Star className="h-4 w-4 mr-1" />
          Destacar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkFeature(false)}
        >
          <StarOff className="h-4 w-4 mr-1" />
          Remover destaque
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedCount} artigos?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os artigos selecionados serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onBulkDelete}>
                Excluir todos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
