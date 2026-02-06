import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Trash2, Send, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/hooks/useAuth";
import { useArticleComments, useCreateComment, useDeleteComment } from "@/hooks/useArticleComments";
import { useToast } from "@/hooks/use-toast";

interface CommentSectionProps {
  articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useArticleComments(articleId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !user) return;

    if (trimmed.length > 1000) {
      toast({ title: "Comentário muito longo", description: "Máximo de 1000 caracteres.", variant: "destructive" });
      return;
    }

    try {
      await createComment.mutateAsync({ articleId, userId: user.id, content: trimmed });
      setNewComment("");
      toast({ title: "Comentário publicado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, articleId });
      toast({ title: "Comentário removido" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getUserName = (comment: any) => {
    return comment.profiles?.display_name || comment.profiles?.email?.split("@")[0] || "Usuário";
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Comentários {comments && comments.length > 0 && `(${comments.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment form */}
        {user ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Escreva seu comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/1000
              </span>
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || createComment.isPending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {createComment.isPending ? "Enviando..." : "Comentar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground mb-3">Faça login para comentar</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">
                <LogIn className="h-4 w-4 mr-1" />
                Entrar
              </Link>
            </Button>
          </div>
        )}

        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ptBR,
              });

              return (
                <div key={comment.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{getUserName(comment)}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    </div>
                    {user && user.id === comment.user_id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(comment.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
