import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsSaved, useToggleSave } from "@/hooks/useSavedArticles";
import { useToast } from "@/hooks/use-toast";

interface SaveButtonProps {
  articleId: string;
  className?: string;
}

export function SaveButton({ articleId, className = "" }: SaveButtonProps) {
  const { user } = useAuth();
  const { data: isSaved } = useIsSaved(articleId);
  const toggleSave = useToggleSave(articleId);
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para salvar artigos.",
        variant: "destructive",
      });
      return;
    }
    toggleSave.mutate(undefined, {
      onSuccess: (saved) => {
        toast({ title: saved ? "Artigo salvo!" : "Artigo removido dos salvos" });
      },
    });
  };

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={toggleSave.isPending}
      className={className}
    >
      <Bookmark className={`h-4 w-4 mr-1 ${isSaved ? "fill-current" : ""}`} />
      {isSaved ? "Salvo" : "Salvar"}
    </Button>
  );
}
