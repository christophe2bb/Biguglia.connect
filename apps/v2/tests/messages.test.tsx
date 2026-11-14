import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import Messages from "../src/pages/Messages";
import type { Row } from "../src/lib/client";
type Event = {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};
type Channel = {
  name: string;
  listeners: {
    filter: Record<string, string>;
    callback: (event: Event) => void;
  }[];
  status?: (status: string) => void;
};
const mocks = vi.hoisted(() => ({
  user: "00000000-0000-4000-8000-000000000200",
  request: vi.fn(),
  post: vi.fn(),
  read: vi.fn(),
  messages: [] as Row[],
  blocked: false,
  channels: [] as Channel[],
}));
vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: mocks.user } } }),
}));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mocks.request,
  authClient: {
    channel: (name: string) => {
      const record: Channel = { name, listeners: [] };
      mocks.channels.push(record);
      const api = { on: vi.fn(), subscribe: vi.fn() };
      api.on.mockImplementation(
        (
          _kind: string,
          filter: Record<string, string>,
          callback: (event: Event) => void,
        ) => {
          record.listeners.push({ filter, callback });
          return api;
        },
      );
      api.subscribe.mockImplementation((callback: (status: string) => void) => {
        record.status = callback;
        return api;
      });
      return api;
    },
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const message = (n: number): Row => ({
  id: id(n),
  conversation_id: id(100),
  sender_id: id(300),
  content: "Message historique " + n,
  created_at: "2026-11-14T10:00:00.000000+00:00",
  deleted_at: null,
});
type Options = {
  method?: string;
  body?: Row;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};
function Scene({ strict = false }: { strict?: boolean }) {
  const scene = (
    <MemoryRouter initialEntries={["/messages/" + id(100)]}>
      <Link to={"/messages/" + id(101)}>Autre conversation de recette</Link>
      <Routes>
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </MemoryRouter>
  );
  return strict ? <StrictMode>{scene}</StrictMode> : scene;
}
beforeEach(() => {
  mocks.user = id(200);
  mocks.messages = [message(1)];
  mocks.blocked = false;
  mocks.channels = [];
  mocks.request.mockReset();
  mocks.post.mockReset();
  mocks.read.mockReset();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  mocks.read.mockResolvedValue("2026-11-14T10:00:00Z");
  mocks.post.mockImplementation(async (payload: Row) => {
    const confirmed = {
      ...payload,
      created_at: "2026-11-14T10:01:00Z",
      deleted_at: null,
    };
    mocks.messages.push(confirmed);
    return [confirmed];
  });
  mocks.request.mockImplementation(
    async (table: string, options: Options = {}) => {
      if (table === "conversations")
        return [
          {
            id: id(100),
            subject: "Devis de recette",
            updated_at: "2026-11-14T10:00:00Z",
          },
          {
            id: id(101),
            subject: "Autre devis",
            updated_at: "2026-11-14T09:00:00Z",
          },
        ];
      if (table === "rpc/get_conversation_other_participant")
        return [{ user_id: id(300), full_name: "Correspondant de recette" }];
      if (table === "rpc/bc_v2_mark_conversation_read")
        return mocks.read(options.body);
      if (table === "user_blocks") {
        if (options.method === "POST") mocks.blocked = true;
        if (options.method === "DELETE") mocks.blocked = false;
        return mocks.blocked ? [{ id: id(500) }] : [];
      }
      if (table !== "messages") return [];
      if (options.method === "POST") return mocks.post(options.body);
      let rows = mocks.messages.filter(
        (row) => options.query?.conversation_id === `eq.${row.conversation_id}`,
      );
      const filter = String(options.query?.id || "");
      if (filter.startsWith("in.("))
        rows = mocks.messages.filter((row) => filter.includes(row.id));
      else if (filter.startsWith("eq."))
        rows = rows.filter((row) => row.id === filter.slice(3));
      const cursor = String(options.query?.or || "");
      if (cursor) {
        const parts = /^\(created_at\.(lt|gt)\.([^,]+),/.exec(cursor);
        const marker = /id\.(?:lt|gt)\.([a-f0-9-]+)/.exec(cursor);
        if (parts && marker)
          rows = rows.filter((row) => {
            const diff =
              Date.parse(String(row.created_at)) - Date.parse(parts[2]);
            return parts[1] === "lt"
              ? diff < 0 || (diff === 0 && row.id < marker[1])
              : diff > 0 || (diff === 0 && row.id > marker[1]);
          });
      }
      const direction = String(options.query?.order).includes("asc") ? 1 : -1;
      rows = [...rows].sort(
        (a, b) =>
          direction *
          (Date.parse(String(a.created_at)) -
            Date.parse(String(b.created_at)) || a.id.localeCompare(b.id)),
      );
      return rows.slice(0, Number(options.query?.limit || 100));
    },
  );
});
async function composer() {
  const input = await screen.findByLabelText("Votre message");
  await waitFor(() => expect(input).toBeEnabled());
  return input;
}
describe("private messaging journeys", () => {
  it("retries a committed message with the same identifier and verifies the duplicate acknowledgement", async () => {
    mocks.post
      .mockImplementationOnce(async (payload: Row) => {
        mocks.messages.push({ ...payload, created_at: "2026-11-14T10:01:00Z" });
        throw new Error("Coupure de recette.");
      })
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<Scene />);
    await user.type(await composer(), "Bonjour, proposition de rendez-vous.");
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );
    await screen.findByText("Coupure de recette.");
    expect(screen.getByLabelText("Votre message")).toHaveValue(
      "Bonjour, proposition de rendez-vous.",
    );
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Votre message")).toHaveValue(""),
    );
    expect(mocks.post.mock.calls[1][0]).toEqual(mocks.post.mock.calls[0][0]);
    expect(
      within(screen.getByRole("log")).getAllByText(
        "Bonjour, proposition de rendez-vous.",
      ),
    ).toHaveLength(1);
    expect(
      mocks.messages.filter(
        (row) => row.content === "Bonjour, proposition de rendez-vous.",
      ),
    ).toHaveLength(1);
  });
  it("keeps a draft when the server does not confirm an insertion or an existing duplicate", async () => {
    mocks.post.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<Scene />);
    await user.type(await composer(), "Ce message reste dans le brouillon.");
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );
    await screen.findByText(/L’envoi n’a pas été confirmé/);
    expect(screen.getByLabelText("Votre message")).toHaveValue(
      "Ce message reste dans le brouillon.",
    );
  });
  it("does not erase a new draft typed while the previous message is being acknowledged", async () => {
    let resolve!: (rows: Row[]) => void;
    let sent!: Row;
    mocks.post.mockImplementationOnce((payload: Row) => {
      sent = payload;
      return new Promise<Row[]>((done) => {
        resolve = done;
      });
    });
    const user = userEvent.setup();
    render(<Scene />);
    const input = await composer();
    await user.type(input, "Premier message envoyé.");
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );
    await user.clear(input);
    await user.type(input, "Mon prochain brouillon.");
    await act(async () => {
      resolve([{ ...sent, created_at: "2026-11-14T10:01:00Z" }]);
    });
    expect(input).toHaveValue("Mon prochain brouillon.");
    expect(
      await screen.findByText("Premier message envoyé."),
    ).toBeInTheDocument();
  });
  it("starts with an empty draft when switching conversations", async () => {
    const user = userEvent.setup();
    render(<Scene />);
    await user.type(await composer(), "Texte privé du premier échange.");
    await user.click(
      screen.getByRole("link", { name: "Autre conversation de recette" }),
    );
    expect(await composer()).toHaveValue("");
  });
  it("starts with an empty draft and scopes the inbox to the newly signed-in account", async () => {
    const user = userEvent.setup();
    const view = render(<Scene />);
    await user.type(await composer(), "Brouillon du premier compte.");
    mocks.user = id(201);
    mocks.messages = [];
    view.rerender(<Scene />);
    expect(await composer()).toHaveValue("");
    expect(
      mocks.request.mock.calls
        .filter(([table]) => table === "conversations")
        .at(-1)?.[1].query["conversation_participants.user_id"],
    ).toBe(`eq.${id(201)}`);
  });
  it("loads older history and does not duplicate messages at the page boundary", async () => {
    mocks.messages = Array.from({ length: 60 }, (_, index) =>
      message(index + 1),
    );
    const user = userEvent.setup();
    render(<Scene />);
    await screen.findByText("Message historique 60");
    expect(screen.queryByText("Message historique 1")).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Messages plus anciens" }),
    );
    await screen.findByText("Message historique 1");
    expect(
      within(screen.getByRole("log")).getAllByText(/^Message historique /),
    ).toHaveLength(60);
    expect(
      screen.queryByRole("button", { name: "Messages plus anciens" }),
    ).not.toBeInTheDocument();
  });
  it("updates a loaded message when it is deleted and exposes manual refresh if direct reception fails", async () => {
    render(<Scene />);
    await screen.findByText("Message historique 1");
    const channel = mocks.channels.find(
      (c) => c.name === "bc-v2-messages-" + id(100),
    )!;
    act(() => {
      channel.listeners
        .find((x) => x.filter.table === "messages")!
        .callback({
          eventType: "UPDATE",
          new: { ...message(1), deleted_at: "2026-11-14T10:02:00Z" },
          old: {},
        });
      channel.status?.("CHANNEL_ERROR");
    });
    expect(screen.getByText("Message supprimé")).toBeInTheDocument();
    expect(screen.queryByText("Message historique 1")).not.toBeInTheDocument();
    expect(
      screen.getByText(/La réception en direct est momentanément indisponible/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actualiser la conversation" }),
    ).toBeInTheDocument();
  });
  it("offers a read-marker retry while keeping the conversation usable", async () => {
    mocks.read.mockRejectedValueOnce(
      new Error("Lecture de recette non confirmée."),
    );
    const user = userEvent.setup();
    render(<Scene />);
    await composer();
    await user.click(
      await screen.findByRole("button", {
        name: "Réessayer l’accusé de lecture",
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Réessayer l’accusé de lecture" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Message historique 1")).toBeInTheDocument();
  });
  it("sends from the surviving StrictMode instance using a live request signal", async () => {
    const user = userEvent.setup();
    render(<Scene strict />);
    await user.type(await composer(), "Message depuis React StrictMode.");
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Votre message")).toHaveValue(""),
    );
    expect(
      mocks.request.mock.calls.find(
        ([table, options]) => table === "messages" && options.method === "POST",
      )?.[1].signal.aborted,
    ).toBe(false);
  });
});
