import { useCallback, useEffect, useRef, useState } from "react";
import { request, errorText, type Query, type Row } from "./client";
import {
  cursorFilter,
  cursorOf,
  mergeRows,
  type Cursor,
  type DateColumn,
} from "./messaging";

type Config = {
  key: string;
  table: string;
  select: string;
  column: DateColumn;
  filters?: Query;
  enabled: boolean;
  pageSize?: number;
};
type Snapshot = {
  key: string;
  rows: Row[];
  busy: "initial" | "older" | "refresh" | "";
  error: string;
  hasOlder: boolean;
  hasNewer: boolean;
};
type Context = Snapshot & {
  config: Config;
  abort: AbortController;
  oldest?: Cursor;
  newest?: Cursor;
  initialized: boolean;
  queued: boolean;
  reconcileQueued: boolean;
  failed: "older" | "refresh";
  refresh: (reconcile?: boolean) => Promise<void>;
  loadOlder: () => Promise<void>;
};
const empty = (key: string): Snapshot => ({
  key,
  rows: [],
  busy: "initial",
  error: "",
  hasOlder: false,
  hasNewer: false,
});

// Keyset pagination is independent of arrival order and remains account-scoped.
export function usePagedFeed(config: Config) {
  const { key, enabled } = config;
  const latest = useRef(config);
  latest.current = config;
  const current = useRef<Context | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => empty(key));
  const publish = (ctx: Context) => {
    if (current.current === ctx && !ctx.abort.signal.aborted)
      setSnapshot({
        key: ctx.key,
        rows: ctx.rows,
        busy: ctx.busy,
        error: ctx.error,
        hasOlder: ctx.hasOlder,
        hasNewer: ctx.hasNewer,
      });
  };
  useEffect(() => {
    if (!enabled) {
      current.current = null;
      return;
    }
    const ctx: Context = {
      ...empty(key),
      busy: "",
      config: { ...latest.current },
      abort: new AbortController(),
      initialized: false,
      queued: false,
      reconcileQueued: false,
      failed: "refresh",
      refresh: async () => {},
      loadOlder: async () => {},
    };
    current.current = ctx;
    const size = ctx.config.pageSize || 50;
    const page = async (direction: "older" | "newer", cursor?: Cursor) =>
      request<Row[]>(ctx.config.table, {
        query: {
          ...ctx.config.filters,
          select: ctx.config.select,
          order: `${ctx.config.column}.${direction === "older" ? "desc" : "asc"},id.${direction === "older" ? "desc" : "asc"}`,
          limit: size + 1,
          ...(cursor
            ? { or: cursorFilter(ctx.config.column, cursor, direction) }
            : {}),
        },
        signal: ctx.abort.signal,
      });
    const finish = () => {
      ctx.busy = "";
      publish(ctx);
      if (ctx.queued && !ctx.abort.signal.aborted) {
        ctx.queued = false;
        const reconcile = ctx.reconcileQueued;
        ctx.reconcileQueued = false;
        void ctx.refresh(reconcile);
      }
    };
    const reconcileRows = async () => {
      const ids = ctx.rows.map((row) => row.id);
      for (let offset = 0; offset < ids.length; offset += 100) {
        const chunk = ids.slice(offset, offset + 100);
        const rows = await request<Row[]>(ctx.config.table, {
          query: {
            ...ctx.config.filters,
            select: ctx.config.select,
            id: `in.(${chunk.join(",")})`,
            limit: chunk.length,
          },
          signal: ctx.abort.signal,
        });
        // Deleted rows and rows whose access was revoked must leave the cache.
        if (ctx.abort.signal.aborted) return;
        const known = new Set(chunk);
        ctx.rows = mergeRows(
          ctx.rows.filter((row) => !known.has(row.id)),
          rows,
          ctx.config.column,
        );
        publish(ctx);
      }
    };
    ctx.refresh = async (reconcile = false) => {
      if (ctx.abort.signal.aborted) return;
      if (ctx.busy) {
        ctx.queued = true;
        ctx.reconcileQueued ||= reconcile;
        return;
      }
      ctx.busy = ctx.initialized ? "refresh" : "initial";
      ctx.error = "";
      ctx.failed = "refresh";
      publish(ctx);
      try {
        if (!ctx.initialized || !ctx.newest) {
          const rows = await page("older");
          if (ctx.abort.signal.aborted) return;
          const shown = rows.slice(0, size);
          ctx.rows = mergeRows(ctx.rows, shown, ctx.config.column);
          ctx.newest = shown[0]
            ? cursorOf(shown[0], ctx.config.column)
            : undefined;
          ctx.oldest = shown.at(-1)
            ? cursorOf(shown.at(-1)!, ctx.config.column)
            : undefined;
          ctx.hasOlder = rows.length > size;
          ctx.hasNewer = false;
          ctx.initialized = true;
        } else {
          // Read from the last server cursor in ascending order. A large burst
          // cannot leave a gap between the cached history and the latest page.
          for (let batch = 0; batch < 10; batch++) {
            const rows = await page("newer", ctx.newest);
            if (ctx.abort.signal.aborted) return;
            const shown = rows.slice(0, size);
            ctx.rows = mergeRows(ctx.rows, shown, ctx.config.column);
            if (shown.length)
              ctx.newest = cursorOf(shown.at(-1)!, ctx.config.column);
            ctx.hasNewer = rows.length > size;
            publish(ctx);
            if (!ctx.hasNewer) break;
          }
        }
        if (reconcile) await reconcileRows();
      } catch (e) {
        if (!ctx.abort.signal.aborted) ctx.error = errorText(e);
      } finally {
        finish();
      }
    };
    // Older pages share the same context and cannot overwrite a newer account.
    ctx.loadOlder = async () => {
      if (ctx.busy || !ctx.hasOlder || !ctx.oldest || ctx.abort.signal.aborted)
        return;
      ctx.busy = "older";
      ctx.error = "";
      ctx.failed = "older";
      publish(ctx);
      try {
        const rows = await page("older", ctx.oldest);
        const shown = rows.slice(0, size);
        if (ctx.abort.signal.aborted) return;
        ctx.rows = mergeRows(ctx.rows, shown, ctx.config.column);
        if (shown.length)
          ctx.oldest = cursorOf(shown.at(-1)!, ctx.config.column);
        ctx.hasOlder = rows.length > size;
      } catch (e) {
        if (!ctx.abort.signal.aborted) ctx.error = errorText(e);
      } finally {
        finish();
      }
    };
    void ctx.refresh();
    return () => {
      ctx.abort.abort();
      if (current.current === ctx) current.current = null;
    };
  }, [key, enabled]);
  const get = useCallback(
    () => (enabled && current.current?.key === key ? current.current : null),
    [key, enabled],
  );
  const refresh = useCallback(
    (reconcile = false) => get()?.refresh(reconcile),
    [get],
  );
  const loadOlder = useCallback(() => get()?.loadOlder(), [get]);
  const retry = useCallback(
    () => (get()?.failed === "older" ? loadOlder() : refresh(true)),
    [get, loadOlder, refresh],
  );
  const change = useCallback(
    (row: Record<string, unknown>, deleted = false) => {
      const ctx = get();
      if (!ctx || typeof row.id !== "string") return;
      const existing = ctx.rows.find((item) => item.id === row.id);
      if (deleted) {
        ctx.rows = ctx.rows.filter((item) => item.id !== row.id);
        publish(ctx);
        return;
      }
      try {
        ctx.rows = mergeRows(
          ctx.rows,
          [{ ...existing, ...row } as Row],
          ctx.config.column,
        );
        publish(ctx);
      } catch {
        /* A partial realtime event is reconciled on refresh. */
      }
    },
    [get],
  );
  const visible = enabled && snapshot.key === key;
  return {
    ...(visible ? snapshot : empty(key)),
    refresh,
    loadOlder,
    retry,
    change,
    loading: enabled && (!visible || snapshot.busy === "initial"),
  };
}
