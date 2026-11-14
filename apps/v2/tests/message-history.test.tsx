import { StrictMode, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePagedFeed } from "../src/lib/usePagedFeed";
import { cursorFilter, mergeRows, sendMessage } from "../src/lib/messaging";
import type { Row } from "../src/lib/client";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mock.request,
}));
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const row = (n: number): Row => ({
  id: id(n),
  content: "Message de recette " + n,
  created_at: "2026-11-14T10:00:00.000000+00:00",
});
const base = {
  key: "fixture-a",
  table: "messages",
  column: "created_at" as const,
  select: "id,content,created_at",
  filters: { conversation_id: `eq.${id(100)}` },
  enabled: true,
  pageSize: 2,
};
beforeEach(() => mock.request.mockReset());
describe("message history and reconnects", () => {
  it("reaches older messages beyond the first page without duplicates at a tied timestamp", async () => {
    mock.request
      .mockResolvedValueOnce([row(5), row(4), row(3)])
      .mockResolvedValueOnce([row(3), row(2), row(1)])
      .mockResolvedValueOnce([row(1)]);
    const { result } = renderHook(() => usePagedFeed(base));
    await waitFor(() =>
      expect(result.current.rows.map((r) => r.id)).toEqual([id(5), id(4)]),
    );
    await act(async () => {
      await result.current.loadOlder();
    });
    await act(async () => {
      await result.current.loadOlder();
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(
      [5, 4, 3, 2, 1].map(id),
    );
    expect(result.current.hasOlder).toBe(false);
    expect(mock.request.mock.calls[1][1].query.or).toContain("id.lt." + id(4));
    expect(
      mock.request.mock.calls.every(
        ([, options]) => options.query.offset === undefined,
      ),
    ).toBe(true);
  });
  it("fills a burst larger than one page even when realtime already showed its newest row", async () => {
    mock.request
      .mockResolvedValueOnce([row(2), row(1)])
      .mockResolvedValueOnce([row(3), row(4), row(5)])
      .mockResolvedValueOnce([row(5), row(6), row(7)])
      .mockResolvedValueOnce([row(7)]);
    const { result } = renderHook(() => usePagedFeed(base));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.change(row(7)));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(
      [7, 6, 5, 4, 3, 2, 1].map(id),
    );
    expect(mock.request.mock.calls[1][1].query.or).toContain("id.gt." + id(2));
    expect(mock.request.mock.calls[1][1].query.order).toBe(
      "created_at.asc,id.asc",
    );
    expect(result.current.hasNewer).toBe(false);
  });
  it("serializes initial loading and coalesces refreshes instead of starting overlapping initial requests", async () => {
    let resolve!: (value: Row[]) => void;
    mock.request
      .mockReturnValueOnce(
        new Promise<Row[]>((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValue([]);
    const { result } = renderHook(() => usePagedFeed(base));
    act(() => {
      void result.current.refresh();
      void result.current.refresh();
    });
    expect(mock.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve([row(1)]);
    });
    await waitFor(() => expect(result.current.busy).toBe(""));
    expect(mock.request).toHaveBeenCalledTimes(2);
    expect(result.current.rows).toHaveLength(1);
  });
  it("reconciles edits and removes deleted or inaccessible messages after resuming", async () => {
    mock.request
      .mockResolvedValueOnce([row(3), row(2)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { ...row(3), deleted_at: "2026-11-14T11:00:00Z" },
      ]);
    const { result } = renderHook(() => usePagedFeed(base));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh(true);
    });
    expect(result.current.rows.map((r) => r.id)).toEqual([id(3)]);
    expect(result.current.rows[0].deleted_at).toBeTruthy();
    expect(mock.request.mock.calls[2][1].query.id).toBe(
      `in.(${id(3)},${id(2)})`,
    );
  });
  it("keeps current messages visible when loading an older page fails and retries that page", async () => {
    mock.request
      .mockResolvedValueOnce([row(4), row(3), row(2)])
      .mockRejectedValueOnce(new Error("Panne de recette."))
      .mockResolvedValueOnce([row(2), row(1)]);
    const { result } = renderHook(() => usePagedFeed(base));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.loadOlder();
    });
    expect(result.current.rows.map((r) => r.id)).toEqual([id(4), id(3)]);
    expect(result.current.error).toBe("Panne de recette.");
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.rows).toHaveLength(4);
    expect(result.current.error).toBe("");
    expect(mock.request.mock.calls[2][1].query.or).toBe(
      mock.request.mock.calls[1][1].query.or,
    );
  });
  it("does not publish a late response from another account or conversation", async () => {
    let resolve!: (value: Row[]) => void;
    mock.request
      .mockReturnValueOnce(
        new Promise<Row[]>((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValueOnce([row(9)]);
    const { result, rerender } = renderHook(
      ({ key }) => usePagedFeed({ ...base, key }),
      { initialProps: { key: "first-account" } },
    );
    rerender({ key: "second-account" });
    await waitFor(() =>
      expect(result.current.rows.map((r) => r.id)).toEqual([id(9)]),
    );
    await act(async () => {
      resolve([row(1)]);
    });
    expect(result.current.rows.map((r) => r.id)).toEqual([id(9)]);
    expect(mock.request.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("survives React StrictMode's effect replay with a live final request", async () => {
    mock.request.mockResolvedValue([row(1)]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result } = renderHook(() => usePagedFeed(base), { wrapper });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(mock.request.mock.calls.at(-1)?.[1].signal.aborted).toBe(false);
  });
  it("updates a known row from a partial event and ignores an unusable unknown row", async () => {
    mock.request.mockResolvedValue([row(1)]);
    const { result } = renderHook(() => usePagedFeed(base));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.change({ id: id(1), deleted_at: "2026-11-14T11:00:00Z" });
      result.current.change({ id: id(2) });
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].deleted_at).toBeTruthy();
    act(() => result.current.change({ id: id(1) }, true));
    expect(result.current.rows).toHaveLength(0);
  });
});
describe("message ordering and acknowledgement", () => {
  it("preserves microseconds and uses the identifier only for equal instants", () => {
    const older = { ...row(9), created_at: "2026-11-14T10:00:00.000001+00:00" };
    const newer = { ...row(1), created_at: "2026-11-14T11:00:00.000002+01:00" };
    expect(mergeRows([older], [newer], "created_at").map((r) => r.id)).toEqual([
      id(1),
      id(9),
    ]);
  });
  it("rejects a malformed cursor before it can enter a REST filter", () => {
    expect(() =>
      cursorFilter(
        "created_at",
        { id: ")(other.eq.true)", at: "2026-11-14T10:00:00Z" },
        "older",
      ),
    ).toThrow();
  });
  const payload = {
    id: id(1),
    conversation_id: id(100),
    sender_id: id(200),
    content: "Bonjour, message de recette.",
  };
  it("accepts a matching server acknowledgement without another read", async () => {
    mock.request.mockResolvedValue([
      { ...payload, created_at: "2026-11-14T10:00:00Z" },
    ]);
    await expect(
      sendMessage(payload, new AbortController().signal),
    ).resolves.toMatchObject(payload);
    expect(mock.request).toHaveBeenCalledTimes(1);
  });
  it("verifies an ignored duplicate instead of assuming that a retry was saved", async () => {
    mock.request
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { ...payload, created_at: "2026-11-14T10:00:00Z" },
      ]);
    await expect(
      sendMessage(payload, new AbortController().signal),
    ).resolves.toMatchObject(payload);
    expect(mock.request.mock.calls[1][1].query.id).toBe(`eq.${payload.id}`);
  });
  it("rejects an empty or mismatched acknowledgement", async () => {
    mock.request
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...payload, conversation_id: id(101) }]);
    await expect(
      sendMessage(payload, new AbortController().signal),
    ).rejects.toThrow("n’a pas été confirmé");
  });
});
