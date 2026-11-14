import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { RecordDetail, RecordForm } from "../src/pages/Records";
import { moduleBySlug } from "../src/lib/modules";

const mocks = vi.hoisted(() => ({
  user: "resident-fixture",
  role: "resident",
  status: "submitted",
  existing: false,
  request: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: mocks.user } },
    profile: { id: mocks.user, role: mocks.role, status: "active" },
  }),
  isStaff: (profile: { role: string } | null) => profile?.role === "admin",
}));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mocks.request,
  rpc: mocks.rpc,
}));
vi.mock("../src/pages/actions", () =>
  Object.fromEntries(
    [
      "Participation",
      "EquipmentRequest",
      "Comments",
      "Photos",
      "Rating",
      "ReportDialog",
      "FavoriteButton",
    ].map((name) => [name, () => null]),
  ),
);
vi.mock("../src/pages/Appointments", () => ({ Appointments: () => null }));
const module = moduleBySlug("demandes")!;
function Scene({ editing = false }: { editing?: boolean }) {
  return (
    <MemoryRouter
      initialEntries={[
        editing ? "/demandes/quote-1/modifier" : "/demandes/quote-1",
      ]}
    >
      <Link to={editing ? "/demandes/quote-2/modifier" : "/demandes/quote-2"}>
        Autre devis de recette
      </Link>
      <Routes>
        <Route
          path={editing ? "/demandes/:id/modifier" : "/demandes/:id"}
          element={
            editing ? (
              <RecordForm module={module} editing />
            ) : (
              <RecordDetail module={module} />
            )
          }
        />
        <Route path="/messages/:id" element={<p>Conversation ouverte</p>} />
      </Routes>
    </MemoryRouter>
  );
}
beforeEach(() => {
  mocks.user = "resident-fixture";
  mocks.role = "resident";
  mocks.status = "submitted";
  mocks.existing = false;
  mocks.request.mockReset();
  mocks.rpc.mockReset();
  mocks.request.mockImplementation(
    async (table: string, options?: { query?: Record<string, string> }) => {
      if (table === "service_requests") {
        const id = options?.query?.id?.slice(3) || "quote-1";
        return [
          {
            id,
            resident_id: "resident-fixture",
            artisan_id: "artisan-profile-fixture",
            title:
              id === "quote-1" ? "Réparation du portail" : "Pose d’une clôture",
            description: "Intervention de recette sur un devis privé.",
            status: mocks.status,
            created_at: "2026-11-12T00:00:00Z",
          },
        ];
      }
      if (table === "artisan_profiles")
        return [
          {
            id: "artisan-profile-fixture",
            user_id: "artisan-user-fixture",
            business_name: "Atelier de recette",
          },
        ];
      if (table === "conversations")
        return mocks.existing ? [{ id: "conversation-fixture" }] : [];
      return [];
    },
  );
  mocks.rpc.mockResolvedValue("conversation-fixture");
});
describe("private quote contact", () => {
  it("allows the resident to address the assigned artisan instead of themselves", async () => {
    const user = userEvent.setup();
    render(<Scene />);
    await user.click(
      await screen.findByRole("button", { name: "Écrire à l’artisan" }),
    );
    await user.type(
      screen.getByLabelText("Votre message"),
      "Bonjour, quelle date vous convient ?",
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Envoyer le message",
      }),
    );
    await screen.findByText("Conversation ouverte");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "bc_v2_start_conversation",
      expect.objectContaining({
        p_recipient: "artisan-user-fixture",
        p_type: "service_request",
        p_record: "quote-1",
      }),
    );
  });
  it("allows the assigned artisan to write to the resident", async () => {
    mocks.user = "artisan-user-fixture";
    const user = userEvent.setup();
    render(<Scene />);
    await user.click(
      await screen.findByRole("button", { name: "Écrire au résident" }),
    );
    await user.type(
      screen.getByLabelText("Votre message"),
      "Bonjour, je peux vous proposer un rendez-vous.",
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Envoyer le message",
      }),
    );
    await screen.findByText("Conversation ouverte");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "bc_v2_start_conversation",
      expect.objectContaining({
        p_recipient: "resident-fixture",
        p_record: "quote-1",
      }),
    );
  });
  it("opens an existing exchange after quote closure without posting another initial message", async () => {
    mocks.existing = true;
    mocks.status = "completed";
    const user = userEvent.setup();
    render(<Scene />);
    expect(
      await screen.findByRole("combobox", { name: "État de la publication" }),
    ).toBeDisabled();
    await user.click(
      await screen.findByRole("link", { name: "Ouvrir notre échange" }),
    );
    await screen.findByText("Conversation ouverte");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("programs a private quote through appointments instead of offering an inconsistent manual status", async () => {
    render(<Scene />);
    const status = await screen.findByRole("combobox", {
      name: "État de la publication",
    });
    expect(
      within(status).queryByRole("option", { name: "Programmée" }),
    ).not.toBeInTheDocument();
    expect(
      within(status).getByRole("option", { name: "Terminée" }),
    ).toBeInTheDocument();
  });
  it("does not present a contact action to a staff reader outside the private quote", async () => {
    mocks.user = "staff-fixture";
    mocks.role = "admin";
    mocks.existing = true;
    render(<Scene />);
    await screen.findByText("Votre devis privé");
    expect(
      screen.queryByRole("button", { name: /Écrire à|Écrire au/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ouvrir notre échange" }),
    ).not.toBeInTheDocument();
  });
  it("clears an unsent private draft when changing account", async () => {
    const user = userEvent.setup();
    const view = render(<Scene />);
    await user.click(
      await screen.findByRole("button", { name: "Écrire à l’artisan" }),
    );
    await user.type(
      screen.getByLabelText("Votre message"),
      "Brouillon privé du résident.",
    );
    mocks.user = "artisan-user-fixture";
    view.rerender(<Scene />);
    await user.click(
      await screen.findByRole("button", { name: "Écrire au résident" }),
    );
    expect(screen.getByLabelText("Votre message")).toHaveValue("");
  });
  it("clears an unsent private draft when changing quote", async () => {
    const user = userEvent.setup();
    render(<Scene />);
    await user.click(
      await screen.findByRole("button", { name: "Écrire à l’artisan" }),
    );
    await user.type(
      screen.getByLabelText("Votre message"),
      "Brouillon du premier devis.",
    );
    await user.click(
      screen.getByRole("link", { name: "Autre devis de recette" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Écrire à l’artisan" }),
    );
    expect(screen.getByLabelText("Votre message")).toHaveValue("");
    expect(
      screen.getByRole("heading", { name: "Pose d’une clôture" }),
    ).toBeInTheDocument();
  });
  it("loads the selected quote’s edit form when changing records", async () => {
    const user = userEvent.setup();
    render(<Scene editing />);
    expect(await screen.findByLabelText(/Titre/)).toHaveValue(
      "Réparation du portail",
    );
    await user.click(
      screen.getByRole("link", { name: "Autre devis de recette" }),
    );
    expect(await screen.findByLabelText(/Titre/)).toHaveValue(
      "Pose d’une clôture",
    );
  });
});
