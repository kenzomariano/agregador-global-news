import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useArticleTags } from "@/hooks/useArticleTags";

interface ArticleTagsProps {
  articleId: string;
  className?: string;
}

export function ArticleTags({ articleId, className = "" }: ArticleTagsProps) {
  const { data: tags, isLoading } = useArticleTags(articleId);

  if (isLoading || !tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Tag className="h-4 w-4 text-muted-foreground" />
      {tags.map((tag) => (
        <Link key={tag.id} to={`/tag/${encodeURIComponent(tag.tag)}`}>
          <Badge
            variant="secondary"
            className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
          >
            {tag.tag}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
