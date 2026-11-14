import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { RecordList } from "../src/pages/Records";
import Reviews from "../src/pages/Reviews";
import { moduleBySlug } from "../src/lib/modules";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  rpc: vi.fn(),
  artisan: true,
  reviewed: false,
}));
vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: "resident-fixture" } },
    profile: { id: "resident-fixture", role: "resident", status: "active" },
  }),
  isStaff: () => false,
}));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mocks.request,
  rpc: mocks.rpc,
}));
beforeEach(() => {
  mocks.artisan = true;
  mocks.reviewed = false;
  mocks.request.mockReset();
  mocks.rpc.mockReset();
  mocks.request.mockImplementation(async (table: string) =>
    table === "artisan_profiles"
      ? mocks.artisan
        ? [{ id: "artisan-fixture" }]
        : []
      : [],
  );
  mocks.rpc.mockImplementation(async (_name, payload) => payload.p_id);
});

describe("service board scopes", () => {
  it("separates public requests, the resident’s requests and quotes assigned to their artisan profile", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecordList module={moduleBySlug("demandes")!} />
      </MemoryRouter>,
    );
    await screen.findByText("La place est libre pour votre publication");
    expect(
      mocks.request.mock.calls.find(
        ([table]) => table === "service_requests",
      )?.[1].query,
    ).toMatchObject({ artisan_id: "is.null" });
    await user.click(
      screen.getByRole("button", { name: "Mes demandes et devis" }),
    );
    await screen.findByText("Vous n’avez pas encore de demande");
    const own = mocks.request.mock.calls
      .filter(([table]) => table === "service_requests")
      .at(-1)?.[1].query;
    expect(own).toMatchObject({ resident_id: "eq.resident-fixture" });
    expect(own).not.toHaveProperty("artisan_id");
    await user.click(
      screen.getByRole("button", { name: "Devis reçus comme artisan" }),
    );
    await screen.findByText("Aucun devis reçu pour le moment");
    expect(
      mocks.request.mock.calls
        .filter(([table]) => table === "service_requests")
        .at(-1)?.[1].query,
    ).toMatchObject({ artisan_id: "in.(artisan-fixture)" });
    expect(
      mocks.request.mock.calls.find(
        ([table]) => table === "artisan_profiles",
      )?.[1].query.user_id,
    ).toBe("eq.resident-fixture");
  });
  it("returns an empty received view without falling back to every request when no artisan profile exists", async () => {
    mocks.artisan = false;
    render(
      <MemoryRouter initialEntries={["/demandes?vue=recus"]}>
        <RecordList module={moduleBySlug("demandes")!} />
      </MemoryRouter>,
    );
    await screen.findByText("Aucun devis reçu pour le moment");
    expect(
      mocks.request.mock.calls.some(([table]) => table === "service_requests"),
    ).toBe(false);
  });
});

describe("verified review journey", () => {
  beforeEach(() => {
    mocks.request.mockImplementation(async (table: string) => {
      if (table === "service_requests")
        return [
          {
            id: "quote-fixture",
            artisan_id: "artisan-fixture",
            title: "Réparation du portail",
            status: "completed",
          },
        ];
      if (table === "trust_interactions")
        return [
          {
            id: "proof-fixture",
            source_id: "quote-fixture",
            requester_id: "resident-fixture",
            review_requester_done: false,
          },
        ];
      if (table === "reviews")
        return mocks.reviewed
          ? [
              {
                id: "review-fixture",
                artisan_id: "artisan-fixture",
                author_id: "resident-fixture",
                reviewer_id: "resident-fixture",
                target_user_id: "artisan-user-fixture",
                rating: 5,
                comment: "Intervention réalisée avec soin.",
                moderation_status: "visible",
                created_at: "2026-11-12T00:00:00Z",
              },
            ]
          : [];
      return [];
    });
  });
  it("publishes through the verified contract and shows the saved review after reloading", async () => {
    mocks.rpc.mockImplementation(async (_name, payload) => {
      mocks.reviewed = true;
      return payload.p_id;
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Reviews />
      </MemoryRouter>,
    );
    await user.type(
      await screen.findByLabelText("Votre avis public"),
      "Intervention réalisée avec soin.",
    );
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    await screen.findByText(/Votre avis est publié/);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Publier mon avis" }),
      ).not.toBeInTheDocument(),
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "bc_v2_submit_service_review",
      expect.objectContaining({
        p_request: "quote-fixture",
        p_rating: 5,
        p_comment: "Intervention réalisée avec soin.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Avis donnés" }));
    expect(
      await screen.findByText("Intervention réalisée avec soin."),
    ).toBeInTheDocument();
  });
  it("does not offer another review for an artisan already reviewed", async () => {
    mocks.reviewed = true;
    render(
      <MemoryRouter>
        <Reviews />
      </MemoryRouter>,
    );
    await screen.findByText("Aucun avis à donner pour le moment");
    expect(
      screen.queryByLabelText("Votre avis public"),
    ).not.toBeInTheDocument();
  });
  it("keeps the text and identifier when retrying a failed publication", async () => {
    mocks.rpc.mockRejectedValueOnce(
      new Error("Service temporairement indisponible."),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Reviews />
      </MemoryRouter>,
    );
    await user.type(
      await screen.findByLabelText("Votre avis public"),
      "Travail propre et très ponctuel.",
    );
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Votre avis public")).toHaveValue(
      "Travail propre et très ponctuel.",
    );
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    await screen.findByText(/Votre avis est publié/);
    expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
  });
});
