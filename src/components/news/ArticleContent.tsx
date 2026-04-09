import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addHeadingIds } from "./ArticleTableOfContents";

interface ArticleContentProps {
  content: string;
  className?: string;
}

// Check if content is HTML
function isHtml(content: string): boolean {
  const htmlPattern = /<\/?(?:p|div|span|h[1-6]|ul|ol|li|blockquote|a|strong|em|br|table|tr|td|th|img|figure|figcaption)[^>]*>/i;
  return htmlPattern.test(content);
}

// Check if content is Markdown
function isMarkdown(content: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headers
    /\*\*[^*]+\*\*/,        // Bold
    /\*[^*]+\*/,            // Italic
    /\[[^\]]+\]\([^)]+\)/,  // Links
    /^[-*+]\s/m,            // Unordered lists
    /^\d+\.\s/m,            // Ordered lists
    /^>\s/m,                // Blockquotes
    /```[\s\S]*?```/,       // Code blocks
    /`[^`]+`/,              // Inline code
  ];
  
  return markdownPatterns.some((pattern) => pattern.test(content));
}

// Convert markdown-style bold/italic to HTML
function convertMarkdownFormats(content: string): string {
  let converted = content;
  
  // Convert **text** or __text__ to <strong>
  converted = converted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  converted = converted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Convert *text* or _text_ to <em> (but not if part of a word like file_name)
  // Only match if surrounded by spaces or at start/end
  converted = converted.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<strong>$1</strong>');
  converted = converted.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<em>$1</em>');
  
  return converted;
}

// Clean and enhance HTML content
function enhanceHtmlContent(content: string): string {
  // First convert any markdown-style formatting
  let enhanced = convertMarkdownFormats(content);
  
  // Ensure proper heading hierarchy
  // If there are multiple h1s, convert them to h2
  const h1Count = (enhanced.match(/<h1[^>]*>/gi) || []).length;
  if (h1Count > 1) {
    enhanced = enhanced.replace(/<h1([^>]*)>/gi, "<h2$1>");
    enhanced = enhanced.replace(/<\/h1>/gi, "</h2>");
  }
  
  // Add classes to elements for styling
  enhanced = enhanced
    .replace(/<h2([^>]*)>/gi, '<h2$1 class="text-2xl font-bold font-serif mt-8 mb-4 text-foreground">')
    .replace(/<h3([^>]*)>/gi, '<h3$1 class="text-xl font-semibold font-serif mt-6 mb-3 text-foreground">')
    .replace(/<h4([^>]*)>/gi, '<h4$1 class="text-lg font-semibold mt-4 mb-2 text-foreground">')
    .replace(/<p([^>]*)>/gi, '<p$1 class="mb-4 text-foreground/90 leading-relaxed">')
    .replace(/<blockquote([^>]*)>/gi, '<blockquote$1 class="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground">')
    .replace(/<ul([^>]*)>/gi, '<ul$1 class="list-disc list-inside mb-4 space-y-2">')
    .replace(/<ol([^>]*)>/gi, '<ol$1 class="list-decimal list-inside mb-4 space-y-2">')
    .replace(/<li([^>]*)>/gi, '<li$1 class="text-foreground/90">')
    .replace(/<a([^>]*)>/gi, '<a$1 class="text-primary hover:underline">')
    .replace(/<strong([^>]*)>/gi, '<strong$1 class="font-semibold text-foreground">')
    .replace(/<em([^>]*)>/gi, '<em$1 class="italic">');
  
  return enhanced;
}

// Convert plain text with line breaks to proper paragraphs
function convertPlainTextToHtml(content: string): string {
  // First convert markdown formatting
  const formatted = convertMarkdownFormats(content);
  
  const paragraphs = formatted
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p class="mb-4 text-foreground/90 leading-relaxed">${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  
  return paragraphs;
}

export function ArticleContent({ content, className = "" }: ArticleContentProps) {
  const renderedContent = useMemo(() => {
    if (!content) {
      return null;
    }

    // Determine content type and render accordingly
    if (isHtml(content)) {
      const enhanced = addHeadingIds(enhanceHtmlContent(content));
      return (
        <div
          className={`article-content ${className}`}
          dangerouslySetInnerHTML={{ __html: enhanced }}
        />
      );
    }

    if (isMarkdown(content)) {
      return (
        <div className={`article-content prose prose-lg max-w-none dark:prose-invert ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => {
                const text = typeof children === "string" ? children : String(children);
                const id = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                return <h2 id={id} className="text-2xl font-bold font-serif mt-8 mb-4 text-foreground">{children}</h2>;
              },
              h2: ({ children }) => {
                const text = typeof children === "string" ? children : String(children);
                const id = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                return <h2 id={id} className="text-2xl font-bold font-serif mt-8 mb-4 text-foreground">{children}</h2>;
              },
              h3: ({ children }) => {
                const text = typeof children === "string" ? children : String(children);
                const id = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                return <h3 id={id} className="text-xl font-semibold font-serif mt-6 mb-3 text-foreground">{children}</h3>;
              },
              h4: ({ children }) => {
                const text = typeof children === "string" ? children : String(children);
                const id = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                return <h4 id={id} className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h4>;
              },
              p: ({ children }) => (
                <p className="mb-4 text-foreground/90 leading-relaxed">{children}</p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground/90">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    // Plain text fallback
    const htmlContent = convertPlainTextToHtml(content);
    return (
      <div
        className={`article-content ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }, [content, className]);

  return renderedContent;
}
