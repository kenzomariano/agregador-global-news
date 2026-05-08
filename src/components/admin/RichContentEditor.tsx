import { useRef, useState } from "react";
import {
  Bold, Italic, Link as LinkIcon, List, ListOrdered, Image as ImageIcon,
  Video, Heading2, Heading3, Quote, Code, Eye, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArticleContent } from "@/components/news/ArticleContent";

interface RichContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

type DialogMode = null | "link" | "image" | "video";

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function RichContentEditor({ value, onChange, rows = 14 }: RichContentEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [dialogUrl, setDialogUrl] = useState("");
  const [dialogText, setDialogText] = useState("");

  const surround = (before: string, after: string, placeholder = "") => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    const next = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + before.length + selected.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertBlock = (text: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const prefix = value.substring(0, start);
    const needsBreak = prefix.length > 0 && !prefix.endsWith("\n");
    const insertion = (needsBreak ? "\n" : "") + text + "\n";
    onChange(prefix + insertion + value.substring(start));
    setTimeout(() => {
      ta.focus();
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const openDialog = (mode: DialogMode) => {
    const ta = ref.current;
    if (mode === "link" && ta) {
      setDialogText(value.substring(ta.selectionStart, ta.selectionEnd));
    } else {
      setDialogText("");
    }
    setDialogUrl("");
    setDialog(mode);
  };

  const handleDialogConfirm = () => {
    if (!dialogUrl.trim()) { setDialog(null); return; }
    if (dialog === "link") {
      surround(`<a href="${dialogUrl}" target="_blank" rel="noopener">`, `</a>`, dialogText || dialogUrl);
    } else if (dialog === "image") {
      insertBlock(`<figure><img src="${dialogUrl}" alt="${dialogText || ""}" />${dialogText ? `<figcaption>${dialogText}</figcaption>` : ""}</figure>`);
    } else if (dialog === "video") {
      const embed = toEmbedUrl(dialogUrl);
      insertBlock(`<div class="aspect-video my-6"><iframe src="${embed}" class="w-full h-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`);
    }
    setDialog(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => surround("<strong>", "</strong>", "texto em negrito")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => surround("<em>", "</em>", "itálico")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertBlock("<h2>Subtítulo</h2>")}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertBlock("<h3>Subtítulo menor</h3>")}>
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertBlock("<ul>\n  <li>Item</li>\n  <li>Item</li>\n</ul>")}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertBlock("<ol>\n  <li>Primeiro</li>\n  <li>Segundo</li>\n</ol>")}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertBlock("<blockquote>Citação</blockquote>")}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => openDialog("link")}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => openDialog("image")}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => openDialog("video")}>
          <Video className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => surround("<code>", "</code>", "code")}>
          <Code className="h-4 w-4" />
        </Button>
        <div className="ml-auto">
          <Button type="button" size="sm" variant={preview ? "default" : "ghost"} onClick={() => setPreview((p) => !p)}>
            {preview ? <Pencil className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {preview ? "Editar" : "Pré-visualizar"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[300px] rounded-md border p-4">
          {value ? <ArticleContent content={value} /> : <p className="text-muted-foreground text-sm">Sem conteúdo</p>}
        </div>
      ) : (
        <Textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
          placeholder="<p>Escreva seu artigo aqui usando HTML ou use a barra de ferramentas...</p>"
        />
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "link" && "Inserir Link"}
              {dialog === "image" && "Inserir Imagem"}
              {dialog === "video" && "Inserir Vídeo Embedado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input
                autoFocus
                value={dialogUrl}
                onChange={(e) => setDialogUrl(e.target.value)}
                placeholder={
                  dialog === "video"
                    ? "https://www.youtube.com/watch?v=..."
                    : dialog === "image"
                    ? "https://exemplo.com/imagem.jpg"
                    : "https://..."
                }
              />
            </div>
            {(dialog === "link" || dialog === "image") && (
              <div className="space-y-1.5">
                <Label>{dialog === "link" ? "Texto do link" : "Legenda (opcional)"}</Label>
                <Input value={dialogText} onChange={(e) => setDialogText(e.target.value)} />
              </div>
            )}
            {dialog === "video" && (
              <p className="text-xs text-muted-foreground">
                Suporte a YouTube e Vimeo. URLs comuns são convertidas em embed automaticamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleDialogConfirm}>Inserir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
