import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---- Mocks ----
const selectMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: selectMock,
    })),
  },
}));

const mockUser: { user: { id: string } | null } = { user: null };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUser,
}));

import { useArticleComments, __test__ as commentsTest } from "@/hooks/useArticleComments";
import { useArticleLikes } from "@/hooks/useArticleLikes";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  selectMock.mockReset();
  eqMock.mockReset();
  orderMock.mockReset();
  // chain: select -> eq -> order (resolved value)
  orderMock.mockResolvedValue({ data: [], error: null });
  eqMock.mockReturnValue({ order: orderMock });
  selectMock.mockReturnValue({ eq: eqMock });
});

describe("article_comments column-level grants (frontend contract)", () => {
  it("uses anon-safe columns (no user_id) when not authenticated", async () => {
    mockUser.user = null;
    const { result } = renderHook(() => useArticleComments("article-1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectMock).toHaveBeenCalledWith(commentsTest.ANON_COMMENT_COLUMNS);
    expect(commentsTest.ANON_COMMENT_COLUMNS).not.toContain("user_id");
  });

  it("includes user_id only for authenticated readers", async () => {
    mockUser.user = { id: "u-1" };
    const { result } = renderHook(() => useArticleComments("article-2"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectMock).toHaveBeenCalledWith(commentsTest.AUTH_COMMENT_COLUMNS);
    expect(commentsTest.AUTH_COMMENT_COLUMNS).toContain("user_id");
  });
});

describe("article_likes count query (frontend contract)", () => {
  it("requests an anon-allowed column (id) with head:true count", async () => {
    mockUser.user = null;
    // Override chain: select -> eq (resolved, no .order)
    eqMock.mockResolvedValue({ count: 0, error: null });
    selectMock.mockReturnValue({ eq: eqMock });

    const { result } = renderHook(() => useArticleLikes("article-3"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.likesCount).toBe(0));

    // Must NOT use "*" (which would require SELECT on user_id for anon).
    const args = selectMock.mock.calls[0];
    expect(args[0]).toBe("id");
    expect(args[1]).toMatchObject({ count: "exact", head: true });
    expect(args[0]).not.toBe("*");
  });
});
