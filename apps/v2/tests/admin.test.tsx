import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Admin from "../src/pages/Admin";

const mocks = vi.hoisted(() => ({
  role: "admin",
  profileError: "",
  request: vi.fn(),
  rpc: vi.fn(),
  reloadProfile: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: "admin-fixture" } },
    profile: mocks.profileError
      ? null
      : {
          id: "admin-fixture",
          role: mocks.role,
          full_name: "Administration de test",
        },
    profileError: mocks.profileError,
    reloadProfile: mocks.reloadProfile,
  }),
  isStaff: (profile: { role: string } | null) =>
    !!profile && ["admin", "moderator"].includes(profile.role),
}));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mocks.request,
  rpc: mocks.rpc,
}));
beforeEach(() => {
  mocks.role = "admin";
  mocks.profileError = "";
  mocks.request.mockReset();
  mocks.rpc.mockReset();
  mocks.reloadProfile.mockReset();
  mocks.request.mockImplementation(async (table: string) =>
    table === "profiles"
      ? [
          {
            id: "member-fixture",
            full_name: "Membre de test",
            role: "resident",
            status: "active",
            created_at: "2026-11-12T00:00:00Z",
          },
        ]
      : [],
  );
  mocks.rpc.mockResolvedValue("member-fixture");
});
describe("administrative UI decisions", () => {
  it("requires a reason and sends one confirmed decision instead of patching protected columns", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Utilisateurs" }));
    await screen.findByText("Membre de test");
    await user.selectOptions(
      screen.getByLabelText("État du compte"),
      "suspended",
    );
    const confirm = screen.getByRole("button", {
      name: "Confirmer la décision",
    });
    expect(confirm).toBeDisabled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText(/Motif/),
      "Motif explicite pour la recette.",
    );
    await user.click(confirm);
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("bc_v2_admin_decision", {
        p_target: "member-fixture",
        p_action: "suspend",
        p_reason: "Motif explicite pour la recette.",
      }),
    );
    expect(
      mocks.request.mock.calls.every(
        ([, options]) => options?.method !== "PATCH",
      ),
    ).toBe(true);
  });
  it("shows the moderator only the moderation domains they can operate", () => {
    mocks.role = "moderator";
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("button", { name: "Utilisateurs" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Artisans à vérifier" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Signalements" }),
    ).toBeInTheDocument();
  });
  it("offers a retry when loading the administrator profile fails", async () => {
    mocks.profileError = "Profil temporairement indisponible.";
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(mocks.profileError);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(mocks.reloadProfile).toHaveBeenCalledOnce();
  });
});
