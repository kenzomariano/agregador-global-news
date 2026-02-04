import { Link } from "react-router-dom";
import { Tag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePopularTags } from "@/hooks/useArticleTags";

export function PopularTags() {
  const { data: tags, isLoading } = usePopularTags(15);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tags Populares
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tags || tags.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tags Populares
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`}>
              <Badge
                variant="secondary"
                className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
                <span className="ml-1 text-xs opacity-70">({count})</span>
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
