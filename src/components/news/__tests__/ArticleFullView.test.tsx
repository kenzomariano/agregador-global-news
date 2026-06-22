import { describe, it, expect, vi } from "vitest";
import { articleFullViewPropsAreEqual } from "@/components/news/ArticleFullView";
import type { Article } from "@/hooks/useArticles";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "a1",
    slug: "slug-a1",
    title: "Título A1",
    excerpt: "",
    content: "<p>conteudo</p>",
    image_url: null,
    category: "entretenimento",
    status: "published",
    is_translated: false,
    original_url: "https://example.com",
    published_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    views_count: 0,
    news_sources: { name: "Fonte", logo_url: null },
    ...overrides,
  } as unknown as Article;
}

describe("ArticleFullView memoization (regression)", () => {
  it("skips re-render when only unrelated props change (visible slug navigation)", () => {
    const onTitleVisible = vi.fn();
    const article = makeArticle();
    const prev = { article, isFirst: true, onTitleVisible };
    const next = { article, isFirst: true, onTitleVisible };
    expect(articleFullViewPropsAreEqual(prev, next)).toBe(true);
  });

  it("does not re-render when onTitleVisible reference is stable across parent state changes", () => {
    const stableCallback = vi.fn();
    const article = makeArticle();
    const prev = { article, isFirst: false, onTitleVisible: stableCallback };
    const next = { article, isFirst: false, onTitleVisible: stableCallback };
    expect(articleFullViewPropsAreEqual(prev, next)).toBe(true);
  });

  it("re-renders when the underlying article id changes", () => {
    const cb = vi.fn();
    const prev = { article: makeArticle({ id: "a1" }), isFirst: true, onTitleVisible: cb };
    const next = { article: makeArticle({ id: "a2" }), isFirst: true, onTitleVisible: cb };
    expect(articleFullViewPropsAreEqual(prev, next)).toBe(false);
  });

  it("re-renders when article content was updated (updated_at changes)", () => {
    const cb = vi.fn();
    const prev = {
      article: makeArticle({ updated_at: "2026-01-01T00:00:00Z" }),
      isFirst: true,
      onTitleVisible: cb,
    };
    const next = {
      article: makeArticle({ updated_at: "2026-02-01T00:00:00Z" }),
      isFirst: true,
      onTitleVisible: cb,
    };
    expect(articleFullViewPropsAreEqual(prev, next)).toBe(false);
  });

  it("re-renders if the onTitleVisible callback identity changes (unstable parent)", () => {
    const article = makeArticle();
    const prev = { article, isFirst: true, onTitleVisible: vi.fn() };
    const next = { article, isFirst: true, onTitleVisible: vi.fn() };
    expect(articleFullViewPropsAreEqual(prev, next)).toBe(false);
  });
});
