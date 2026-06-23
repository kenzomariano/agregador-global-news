import { describe, it, expect, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));

import { fetchArticleComments } from "@/hooks/useArticleComments";
import { fetchArticleLikesCount } from "@/hooks/useArticleLikes";

beforeEach(() => {
  selectMock.mockReset();
  eqMock.mockReset();
  orderMock.mockReset();
  fromMock.mockClear();
});

describe("article_comments column-level grants (frontend contract)", () => {
  beforeEach(() => {
    orderMock.mockResolvedValue({ data: [], error: null });
    eqMock.mockReturnValue({ order: orderMock });
    selectMock.mockReturnValue({ eq: eqMock });
  });

  it("uses anon-safe columns (no user_id) when not authenticated", async () => {
    await fetchArticleComments("a1", false);
    expect(fromMock).toHaveBeenCalledWith("article_comments");
    const cols = selectMock.mock.calls[0][0] as string;
    expect(cols).not.toContain("user_id");
    expect(cols).toContain("id");
    expect(cols).toContain("content");
  });

  it("includes user_id only for authenticated readers", async () => {
    await fetchArticleComments("a2", true);
    const cols = selectMock.mock.calls[0][0] as string;
    expect(cols).toContain("user_id");
  });
});

describe("article_likes count query (frontend contract)", () => {
  beforeEach(() => {
    eqMock.mockResolvedValue({ count: 7, error: null });
    selectMock.mockReturnValue({ eq: eqMock });
  });

  it("requests an anon-allowed column (id) — never '*' — with head:true count", async () => {
    const n = await fetchArticleLikesCount("a3");
    expect(n).toBe(7);
    const [col, opts] = selectMock.mock.calls[0];
    expect(col).toBe("id");
    expect(col).not.toBe("*");
    expect(opts).toMatchObject({ count: "exact", head: true });
  });
});
