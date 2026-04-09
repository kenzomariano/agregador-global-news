import { useMemo } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleTableOfContentsProps {
  content: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractHeadings(content: string): TocItem[] {
  const headings: TocItem[] = [];

  // Match HTML headings
  const htmlPattern = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi;
  let match;
  while ((match = htmlPattern.exec(content)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text.length > 0) {
      headings.push({ id: slugify(text), text, level: parseInt(match[1]) });
    }
  }

  // Match markdown headings if no HTML headings found
  if (headings.length === 0) {
    const mdPattern = /^(#{2,4})\s+(.+)$/gm;
    while ((match = mdPattern.exec(content)) !== null) {
      const text = match[2].replace(/\*\*([^*]+)\*\*/g, "$1").trim();
      if (text.length > 0) {
        headings.push({ id: slugify(text), text, level: match[1].length });
      }
    }
  }

  return headings;
}

export function ArticleTableOfContents({ content }: ArticleTableOfContentsProps) {
  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content);
  }, [content]);

  if (headings.length < 2) return null;

  return (
    <nav className="my-6 p-4 bg-muted/50 rounded-lg border" aria-label="Índice do artigo">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
        <List className="h-4 w-4 text-primary" />
        Índice
      </h3>
      <ul className="space-y-1.5">
        {headings.map((heading, idx) => (
          <li
            key={`${heading.id}-${idx}`}
            style={{ paddingLeft: `${(heading.level - 2) * 16}px` }}
          >
            <a
              href={`#${heading.id}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors leading-snug block py-0.5"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(heading.id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Utility to add IDs to headings in HTML content
export function addHeadingIds(html: string): string {
  return html.replace(/<h([2-4])([^>]*)>(.*?)<\/h[2-4]>/gi, (match, level, attrs, text) => {
    const plainText = text.replace(/<[^>]+>/g, "").trim();
    const id = slugify(plainText);
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });
}
