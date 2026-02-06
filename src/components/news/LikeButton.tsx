import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArticleLikes } from "@/hooks/useArticleLikes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  articleId: string;
  className?: string;
}

export function LikeButton({ articleId, className = "" }: LikeButtonProps) {
  const { user } = useAuth();
  const { likesCount, isLiked, toggleLike } = useArticleLikes(articleId);
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para curtir.",
        variant: "destructive",
      });
      return;
    }
    toggleLike.mutate();
  };

  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={toggleLike.isPending}
      className={className}
    >
      <Heart
        className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`}
      />
      {likesCount > 0 ? likesCount : "Curtir"}
    </Button>
  );
}
