import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, RefreshCw, Pencil, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import type { Article } from "@/hooks/useArticles";

interface ArticleListItemProps {
  article: Article;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (article: Article) => void;
  onDelete: (id: string) => void;
  onRescrape: (article: Article) => void;
  isRescraping: boolean;
}

export function ArticleListItem({
  article,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onRescrape,
  isRescraping,
}: ArticleListItemProps) {
  const category = CATEGORIES[article.category as CategoryKey];
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })
    : "recém publicado";

  return (
    <Card className={isSelected ? "ring-2 ring-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Checkbox */}
          <div className="flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(article.id, !!checked)}
            />
          </div>

          {/* Thumbnail */}
          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                📰
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {category?.label || article.category}
                  </Badge>
                  {article.is_featured && (
                    <Badge variant="default" className="text-xs">
                      Destaque
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold line-clamp-1 text-sm">{article.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span>{article.news_sources?.name}</span>
                  <span>•</span>
                  <span>{timeAgo}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.views_count}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Ver artigo"
                  className="h-8 w-8"
                >
                  <Link to={`/noticia/${article.slug}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRescrape(article)}
                  disabled={isRescraping}
                  title="Atualizar via scraping"
                  className="h-8 w-8"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRescraping ? "animate-spin" : ""}`}
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(article)}
                  title="Editar"
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O artigo "{article.title}" será
                        permanentemente removido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(article.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
