import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
const fixture = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => void),
  requests: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("../src/lib/client", async () => {
  const actual =
    await vi.importActual<typeof import("../src/lib/client")>(
      "../src/lib/client",
    );
  return {
    ...actual,
    configured: true,
    request: fixture.requests,
    authClient: {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          fixture.callback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: fixture.getSession,
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
});
import { AuthProvider, useAuth } from "../src/lib/auth";
function ReadState() {
  const a = useAuth();
  return (
    <>
      <span>
        {a.loading
          ? "initialisation"
          : a.session
            ? "session ouverte"
            : "visiteur"}
      </span>
      <span>
        {a.profile
          ? "profil chargé"
          : a.profileError
            ? "profil indisponible"
            : "profil en attente"}
      </span>
    </>
  );
}
const session = {
  access_token: "test-token",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "fixture@example.invalid",
    user_metadata: {},
  },
} as Session;
describe("session independent of profile requests", () => {
  it("opens the session while a profile request is still pending", async () => {
    fixture.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    fixture.requests.mockImplementation(() => new Promise(() => {}));
    render(
      <AuthProvider>
        <ReadState />
      </AuthProvider>,
    );
    await screen.findByText("visiteur");
    act(() => fixture.callback?.("SIGNED_IN", session));
    expect(await screen.findByText("session ouverte")).toBeInTheDocument();
    expect(screen.getByText("profil en attente")).toBeInTheDocument();
  });
  it("keeps the session usable when the profile request fails", async () => {
    fixture.getSession.mockResolvedValue({ data: { session }, error: null });
    fixture.requests.mockRejectedValue(new Error("profil indisponible"));
    render(
      <AuthProvider>
        <ReadState />
      </AuthProvider>,
    );
    expect(await screen.findByText("session ouverte")).toBeInTheDocument();
    expect(await screen.findByText("profil indisponible")).toBeInTheDocument();
  });
  it("clears identity and profile on sign out without waiting for data", async () => {
    fixture.getSession.mockResolvedValue({ data: { session }, error: null });
    fixture.requests.mockResolvedValue([
      { id: session.user.id, role: "resident" },
    ]);
    render(
      <AuthProvider>
        <ReadState />
      </AuthProvider>,
    );
    await screen.findByText("profil chargé");
    act(() => fixture.callback?.("SIGNED_OUT", null));
    expect(await screen.findByText("visiteur")).toBeInTheDocument();
    expect(screen.queryByText("profil chargé")).not.toBeInTheDocument();
  });
});
