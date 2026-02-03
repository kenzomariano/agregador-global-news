import { useState, useEffect } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ArticleTagsManagerProps {
  articleId: string;
  articleTitle: string;
}

export function ArticleTagsManager({ articleId, articleTitle }: ArticleTagsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [articleId]);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("article_tags")
      .select("id, tag")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setTags(data);
    }
  };

  const validateTag = (tag: string): boolean => {
    const words = tag.trim().split(/\s+/);
    if (words.length > 3) {
      toast({
        title: "Tag inválida",
        description: "A tag deve ter no máximo 3 palavras.",
        variant: "destructive",
      });
      return false;
    }
    if (tag.length > 30) {
      toast({
        title: "Tag inválida",
        description: "A tag deve ter no máximo 30 caracteres.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddTag = async () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (!trimmedTag) return;

    if (!validateTag(trimmedTag)) return;

    if (tags.some((t) => t.tag.toLowerCase() === trimmedTag)) {
      toast({
        title: "Tag duplicada",
        description: "Esta tag já existe para este artigo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("article_tags")
        .insert({ article_id: articleId, tag: trimmedTag })
        .select("id, tag")
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      setNewTag("");
      queryClient.invalidateQueries({ queryKey: ["article-tags", articleId] });

      toast({
        title: "Tag adicionada!",
        description: `"${trimmedTag}" foi adicionada ao artigo.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar tag",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string, tagName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("article_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;

      setTags(tags.filter((t) => t.id !== tagId));
      queryClient.invalidateQueries({ queryKey: ["article-tags", articleId] });

      toast({
        title: "Tag removida",
        description: `"${tagName}" foi removida do artigo.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover tag",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Tags do artigo</span>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nenhuma tag adicionada</span>
        ) : (
          tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.tag}
              <button
                onClick={() => handleRemoveTag(tag.id, tag.tag)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                disabled={loading}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Add new tag */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova tag (máx. 3 palavras)"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={loading}
        />
        <Button
          size="sm"
          onClick={handleAddTag}
          disabled={loading || !newTag.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Pressione Enter ou clique em Adicionar. Tags devem ter no máximo 3 palavras.
      </p>
    </div>
  );
}
