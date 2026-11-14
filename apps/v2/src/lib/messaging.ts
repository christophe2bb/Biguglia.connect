import { AppError, request, str, type Row } from "./client";

export const MESSAGE_SELECT =
  "id,conversation_id,sender_id,content,created_at,deleted_at";
export const CONVERSATION_SELECT =
  "id,subject,related_type,related_id,updated_at,exchange_status,conversation_participants!inner(user_id)";
export type DateColumn = "created_at" | "updated_at";
export type Cursor = { at: string; id: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/;

function dateRank(value: string) {
  const match = timestamp.exec(value);
  const date = new Date(value);
  if (!match || Number.isNaN(date.getTime()))
    throw new AppError("L’historique n’a pas pu être chargé. Réessayez.");
  // Keep PostgreSQL microseconds: Date alone rounds them to milliseconds.
  return (
    date.toISOString().slice(0, 19) + "." + (match[1] || "").padEnd(6, "0")
  );
}
export function cursorOf(row: Row, column: DateColumn): Cursor {
  const at = str(row, column);
  if (!uuid.test(row.id))
    throw new AppError("L’historique n’a pas pu être chargé. Réessayez.");
  dateRank(at);
  return { at, id: row.id };
}
export function cursorFilter(
  column: DateColumn,
  cursor: Cursor,
  direction: "older" | "newer",
) {
  cursorOf({ id: cursor.id, [column]: cursor.at }, column);
  const op = direction === "older" ? "lt" : "gt";
  return `(${column}.${op}.${cursor.at},and(${column}.eq.${cursor.at},id.${op}.${cursor.id}))`;
}
export function mergeRows(
  previous: Row[],
  incoming: Row[],
  column: DateColumn,
) {
  const rows = new Map(previous.map((row) => [row.id, row]));
  for (const row of incoming) {
    cursorOf(row, column);
    rows.set(row.id, row);
  }
  return [...rows.values()].sort((a, b) => {
    const left = dateRank(str(a, column)),
      right = dateRank(str(b, column));
    return left !== right
      ? left < right
        ? 1
        : -1
      : a.id === b.id
        ? 0
        : a.id < b.id
          ? 1
          : -1;
  });
}

export async function sendMessage(
  payload: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
  },
  signal: AbortSignal,
) {
  const same = (row: Row) =>
    row.id === payload.id &&
    row.conversation_id === payload.conversation_id &&
    row.sender_id === payload.sender_id &&
    row.content === payload.content;
  let rows = await request<Row[]>("messages", {
    method: "POST",
    body: payload,
    prefer: "resolution=ignore-duplicates,return=representation",
    signal,
  });
  if (!Array.isArray(rows) || !rows.length) {
    // A retry may have reached the server before the first response was lost.
    rows = await request<Row[]>("messages", {
      query: {
        select: MESSAGE_SELECT,
        id: `eq.${payload.id}`,
        conversation_id: `eq.${payload.conversation_id}`,
        limit: 1,
      },
      signal,
    });
  }
  const confirmed = Array.isArray(rows) ? rows.find(same) : undefined;
  if (!confirmed)
    throw new AppError(
      "L’envoi n’a pas été confirmé. Votre brouillon est conservé ; vous pouvez réessayer.",
    );
  return confirmed;
}
