import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  loading: false,
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ useAuth: () => fixture }));
vi.mock("../src/lib/client", async () => ({
  ...(await vi.importActual<typeof import("../src/lib/client")>("../src/lib/client")),
  configured: true,
  authClient: { auth: fixture },
}));
vi.mock("../src/components/NativeBridge", () => ({
  authRedirect: (path: string) => "https://fixture.example" + path,
}));
import Auth from "../src/pages/Auth";
import { AppError } from "../src/lib/client";

function open(path = "/connexion") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/connexion" element={<Auth key="login" />} />
        <Route path="/inscription" element={<Auth key="signup" mode="signup" />} />
        <Route path="/mot-de-passe" element={<Auth key="password" mode="password" />} />
        <Route path="/auth/callback" element={<Auth key="callback" mode="callback" />} />
        <Route path="/dashboard" element={<h1>Mes activités</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
function enterCredentials() {
  fireEvent.change(screen.getByLabelText("Adresse e-mail"), { target: { value: "resident@example.invalid" } });
  fireEvent.change(screen.getByLabelText("Mot de passe", { exact: true }), { target: { value: "fixture-password" } });
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.session = null;
  fixture.loading = false;
  fixture.resend.mockResolvedValue({ data: {}, error: null });
  fixture.signInWithPassword.mockResolvedValue({ data: { session: null }, error: Object.assign(new Error("Invalid login credentials"), { code: "invalid_credentials" }) });
  fixture.signUp.mockResolvedValue({ data: { session: null }, error: null });
  fixture.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
});

describe("account access feedback", () => {
  it("treats a recovery transport timeout as an unknown delivery result without retrying", async () => {
    fixture.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: Object.assign(new Error("Le service met trop de temps à répondre."), {
        name: "AuthRetryableFetchError",
      }),
    });
    open("/mot-de-passe");
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "resident@example.invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recevoir le lien", exact: true }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Envoi non confirmé");
    expect(alert).toHaveTextContent("L’e-mail peut avoir été envoyé");
    expect(screen.queryByText(/un lien pour changer le mot de passe vous a été envoyé/)).not.toBeInTheDocument();
    expect(fixture.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });
  it("does not claim an interrupted signup failed before the server could create the account", async () => {
    fixture.signUp.mockResolvedValue({
      data: { session: null },
      error: new AppError("Le service met trop de temps à répondre.", "request_timeout"),
    });
    open("/inscription");
    enterCredentials();
    fireEvent.change(screen.getByLabelText("Votre nom"), { target: { value: "Essai local" } });
    fireEvent.change(screen.getByLabelText("Confirmez le mot de passe"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Votre inscription peut avoir été enregistrée");
    expect(screen.queryByText(/Votre demande a été prise en compte/)).not.toBeInTheDocument();
    expect(fixture.signUp).toHaveBeenCalledTimes(1);
  });
  it("clears a prior resend success when the next delivery result is unknown", async () => {
    open();
    enterCredentials();
    const resend = screen.getByRole("button", { name: "Renvoyer l’e-mail de confirmation" });
    fireEvent.click(resend);
    await screen.findByText(/un nouvel e-mail a été demandé/);
    fixture.resend.mockResolvedValue({
      data: {},
      error: new AppError("Le service met trop de temps à répondre.", "request_timeout"),
    });
    fireEvent.click(resend);
    expect(await screen.findByRole("alert")).toHaveTextContent("Envoi non confirmé");
    expect(screen.queryByText(/un nouvel e-mail a été demandé/)).not.toBeInTheDocument();
    expect(fixture.resend).toHaveBeenCalledTimes(2);
  });
  it("distinguishes wrong credentials from an unconfirmed address", async () => {
    open();
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("compte Biguglia Connect");
    expect(screen.getByRole("alert")).not.toHaveTextContent("doit encore être confirmée");
  });
  it("offers confirmation only when the service reports an unconfirmed address", async () => {
    fixture.signInWithPassword.mockResolvedValue({ data: { session: null }, error: Object.assign(new Error("Email not confirmed"), { code: "email_not_confirmed" }) });
    open();
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("doit encore être confirmée");
  });
  it("clears a stale login failure when a resend request succeeds", async () => {
    open();
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter", exact: true }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Renvoyer l’e-mail de confirmation" }));
    expect(await screen.findByText(/un nouvel e-mail a été demandé/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fixture.resend).toHaveBeenCalledWith({ type: "signup", email: "resident@example.invalid", options: { emailRedirectTo: "https://fixture.example/auth/callback" } });
  });
  it("replaces a previous resend notice with a real delivery failure", async () => {
    open();
    enterCredentials();
    const resend = screen.getByRole("button", { name: "Renvoyer l’e-mail de confirmation" });
    fireEvent.click(resend);
    await screen.findByText(/un nouvel e-mail a été demandé/);
    fixture.resend.mockResolvedValue({ data: {}, error: Object.assign(new Error("Email address not authorized"), { code: "email_address_not_authorized" }) });
    fireEvent.click(resend);
    expect(await screen.findByRole("alert")).toHaveTextContent("service d’envoi de Biguglia Connect doit être configuré");
    expect(screen.queryByText(/un nouvel e-mail a été demandé/)).not.toBeInTheDocument();
  });
  it("does not claim a confirmation email was sent to an existing confirmed account", async () => {
    open("/inscription");
    enterCredentials();
    fireEvent.change(screen.getByLabelText("Votre nom"), { target: { value: "Essai local" } });
    fireEvent.change(screen.getByLabelText("Confirmez le mot de passe"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText(/aucun nouvel e-mail de confirmation n’est nécessaire/)).toBeInTheDocument();
    expect(screen.queryByText(/Votre demande d’inscription est envoyée/)).not.toBeInTheDocument();
  });
  it("reports an expired callback in the URL fragment without displaying provider text", () => {
    open("/auth/callback#error=access_denied&error_code=otp_expired&error_description=private-debug-content");
    expect(screen.getByRole("heading", { name: "Ce lien ne peut pas être utilisé" })).toBeInTheDocument();
    expect(screen.queryByText(/private-debug-content/)).not.toBeInTheDocument();
    expect(screen.queryByText("Votre lien a été traité")).not.toBeInTheDocument();
  });
  it("never presents a bare callback page as successful confirmation", () => {
    open("/auth/callback");
    expect(screen.getByRole("heading", { name: "Votre connexion n’a pas été confirmée" })).toBeInTheDocument();
  });
  it("does not offer password entry without an authenticated recovery session", () => {
    open("/mot-de-passe?recovery=1");
    expect(screen.getByRole("link", { name: "Recevoir un nouveau lien" })).toHaveAttribute("href", "/mot-de-passe");
    expect(screen.queryByLabelText("Mot de passe", { exact: true })).not.toBeInTheDocument();
    expect(fixture.updateUser).not.toHaveBeenCalled();
  });
  it("waits for recovery initialization before asking for a new password", () => {
    fixture.loading = true;
    open("/mot-de-passe?recovery=1");
    expect(screen.getByRole("status")).toHaveTextContent("Vérification du lien");
    expect(screen.queryByLabelText("Mot de passe", { exact: true })).not.toBeInTheDocument();
  });
  it("forgets a login password when moving to the recovery form", async () => {
    open();
    enterCredentials();
    fireEvent.click(screen.getByRole("link", { name: "Mot de passe oublié ?" }));
    fireEvent.click(screen.getByRole("link", { name: "Revenir à la connexion" }));
    expect(await screen.findByLabelText("Mot de passe", { exact: true })).toHaveValue("");
  });
  it("does not navigate after a login response without a confirmed session", async () => {
    fixture.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
    open();
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La connexion n’a pas été confirmée");
    expect(screen.queryByRole("heading", { name: "Mes activités" })).not.toBeInTheDocument();
  });
});
