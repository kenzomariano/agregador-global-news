import { Link } from "react-router-dom";
import { Bookmark, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import { useToggleSave } from "@/hooks/useSavedArticles";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

function RemoveButton({ articleId }: { articleId: string }) {
  const toggleSave = useToggleSave(articleId);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSave.mutate()}
      disabled={toggleSave.isPending}
      className="text-muted-foreground hover:text-destructive"
    >
      Remover
    </Button>
  );
}

export function SavedArticlesSection() {
  const { data: savedArticles, isLoading } = useSavedArticles();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          Salvos para ler depois
        </CardTitle>
        <CardDescription>Artigos que você salvou para ler mais tarde</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !savedArticles || savedArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum artigo salvo ainda. Use o botão "Salvar" nos artigos para adicioná-los aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {savedArticles.map((saved) => {
              const article = saved.articles as any;
              if (!article) return null;
              const category = CATEGORIES[article.category as CategoryKey];
              const timeAgo = saved.created_at
                ? formatDistanceToNow(new Date(saved.created_at), { addSuffix: true, locale: ptBR })
                : "";

              return (
                <div key={saved.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  {article.image_url && (
                    <Link to={`/noticia/${article.slug}`} className="shrink-0">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-20 h-14 object-cover rounded"
                      />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to={`/noticia/${article.slug}`} className="hover:underline">
                      <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      {category && (
                        <Badge variant="outline" className="text-xs">
                          {category.label}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                  </div>
                  <RemoveButton articleId={article.id} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
