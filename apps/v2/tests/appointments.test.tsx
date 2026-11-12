import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Appointments } from "../src/pages/Appointments";

const mocks = vi.hoisted(() => ({
  user: "resident-fixture",
  request: vi.fn(),
  rpc: vi.fn(),
  appointments: [] as Record<string, unknown>[],
}));
vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: mocks.user } },
    profile: { id: mocks.user, status: "active", is_active: true },
  }),
}));
vi.mock("../src/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/client")>()),
  request: mocks.request,
  rpc: mocks.rpc,
}));

const quote = {
  id: "quote-fixture",
  resident_id: "resident-fixture",
  artisan_id: "artisan-profile-fixture",
  status: "replied",
};
const appointment = {
  id: "appointment-fixture",
  request_id: quote.id,
  resident_id: quote.resident_id,
  artisan_id: quote.artisan_id,
  proposed_by: quote.resident_id,
  proposed_date: "2099-11-12",
  proposed_time: "09:00:00",
  duration_minutes: 60,
  status: "pending",
};

beforeEach(() => {
  mocks.user = quote.resident_id;
  mocks.appointments = [];
  mocks.request.mockReset();
  mocks.rpc.mockReset();
  mocks.request.mockImplementation(async (table: string) =>
    table === "appointments"
      ? mocks.appointments
      : [
          {
            id: quote.artisan_id,
            user_id: "artisan-fixture",
            is_verified: true,
          },
        ],
  );
  mocks.rpc.mockImplementation(async (_name, payload) => payload.p_id);
});

describe("service appointment journeys", () => {
  it("keeps the proposal identifier when retrying after a network error", async () => {
    const user = userEvent.setup();
    mocks.rpc.mockRejectedValueOnce(
      new Error("Réseau temporairement indisponible."),
    );
    render(<Appointments row={quote} onChange={vi.fn()} />);
    await user.click(
      await screen.findByRole("button", { name: "Proposer une date" }),
    );
    await user.type(screen.getByLabelText("Date proposée"), "2099-11-12");
    await user.type(screen.getByLabelText("Heure proposée"), "09:00");
    await user.selectOptions(screen.getByLabelText("Durée estimée"), "90");
    await user.type(
      screen.getByLabelText(/Précisions/),
      "Accès par le portail.",
    );
    await user.click(
      screen.getByRole("button", { name: "Envoyer la proposition" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Réseau temporairement indisponible.",
    );
    await user.click(
      screen.getByRole("button", { name: "Envoyer la proposition" }),
    );
    await screen.findByText(/Votre proposition est enregistrée/);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_request: quote.id,
      p_date: "2099-11-12",
      p_time: "09:00",
      p_duration_minutes: 90,
      p_notes: "Accès par le portail.",
    });
  });
  it("lets only the recipient confirm a proposal after explicit confirmation", async () => {
    mocks.user = "artisan-fixture";
    mocks.appointments = [appointment];
    const changed = vi.fn();
    const user = userEvent.setup();
    render(<Appointments row={quote} onChange={changed} />);
    await user.click(
      await screen.findByRole("button", { name: "Accepter cette date" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/programmer le devis/)).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(mocks.rpc).toHaveBeenCalledWith("bc_v2_appointment_action", {
      p_id: appointment.id,
      p_action: "accept",
    });
  });
  it("shows the author the pending state without self-confirmation", async () => {
    mocks.appointments = [appointment];
    render(<Appointments row={quote} onChange={vi.fn()} />);
    await screen.findByText("En attente de la réponse de votre correspondant.");
    expect(
      screen.queryByRole("button", { name: "Accepter cette date" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Proposer une date" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Annuler ce rendez-vous" }),
    ).toBeInTheDocument();
  });
  it("offers completion to the resident and keeps a failed decision open", async () => {
    mocks.appointments = [{ ...appointment, status: "accepted" }];
    mocks.rpc.mockRejectedValueOnce(new Error("Le devis est indisponible."));
    const changed = vi.fn();
    const user = userEvent.setup();
    render(
      <Appointments
        row={{ ...quote, status: "scheduled" }}
        onChange={changed}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Intervention terminée" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirmer",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le devis est indisponible.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });
  it("does not let the artisan close the resident’s intervention", async () => {
    mocks.user = "artisan-fixture";
    mocks.appointments = [{ ...appointment, status: "accepted" }];
    render(
      <Appointments
        row={{ ...quote, status: "scheduled" }}
        onChange={vi.fn()}
      />,
    );
    await screen.findByText("Rendez-vous confirmé");
    expect(
      screen.queryByRole("button", { name: "Intervention terminée" }),
    ).not.toBeInTheDocument();
  });
});
