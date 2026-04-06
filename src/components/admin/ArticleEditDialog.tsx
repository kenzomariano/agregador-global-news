import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { CATEGORIES, ENTERTAINMENT_SUBCATEGORIES, type CategoryKey } from "@/lib/categories";
import { ArticleTagsManager } from "./ArticleTagsManager";
import type { Article, ArticleStatus } from "@/hooks/useArticles";

interface EditFormData {
  title: string;
  excerpt: string;
  content: string;
  category: CategoryKey;
  subcategory: string;
  status: ArticleStatus;
  image_url: string;
  video_url: string;
  is_featured: boolean;
}

interface ArticleEditDialogProps {
  article: Article | null;
  editForm: EditFormData;
  onFormChange: (form: EditFormData) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ArticleEditDialog({
  article,
  editForm,
  onFormChange,
  onClose,
  onSave,
}: ArticleEditDialogProps) {
  const showSubcategory = editForm.category === "entretenimento";

  return (
    <Dialog open={!!article} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Artigo</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias no artigo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={editForm.title}
              onChange={(e) => onFormChange({ ...editForm, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-excerpt">Resumo</Label>
            <Textarea
              id="edit-excerpt"
              rows={2}
              value={editForm.excerpt}
              onChange={(e) => onFormChange({ ...editForm, excerpt: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Conteúdo</Label>
            <Textarea
              id="edit-content"
              rows={10}
              value={editForm.content}
              onChange={(e) => onFormChange({ ...editForm, content: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => onFormChange({ ...editForm, status: value as ArticleStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">🟡 Rascunho</SelectItem>
                  <SelectItem value="published">🟢 Publicado</SelectItem>
                  <SelectItem value="archived">⚫ Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destaque</Label>
              <Select
                value={editForm.is_featured ? "true" : "false"}
                onValueChange={(value) => onFormChange({ ...editForm, is_featured: value === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Não</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => onFormChange({ ...editForm, category: value as CategoryKey, subcategory: value !== "entretenimento" ? "" : editForm.subcategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showSubcategory && (
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select
                  value={editForm.subcategory || "none"}
                  onValueChange={(value) => onFormChange({ ...editForm, subcategory: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {Object.entries(ENTERTAINMENT_SUBCATEGORIES).map(([key, { label, icon }]) => (
                      <SelectItem key={key} value={key}>
                        {icon} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-image">URL da Imagem</Label>
            <Input
              id="edit-image"
              type="url"
              value={editForm.image_url}
              onChange={(e) => onFormChange({ ...editForm, image_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-video">URL do Vídeo (embed)</Label>
            <Input
              id="edit-video"
              type="url"
              placeholder="https://www.youtube.com/embed/..."
              value={editForm.video_url}
              onChange={(e) => onFormChange({ ...editForm, video_url: e.target.value })}
            />
          </div>

          <Separator className="my-4" />

          {article && (
            <ArticleTagsManager
              articleId={article.id}
              articleTitle={article.title}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
