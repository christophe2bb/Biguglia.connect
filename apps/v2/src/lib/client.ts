import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const configured = !!url && !!key && url.startsWith("https://");
export const apiUrl = url ?? "";
let bearer: string | undefined;
export const setBearer = (token?: string) => {
  bearer = token;
};
export const authHeaders = (): Record<string, string> => ({
  apikey: key ?? "",
  ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
});

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}
export function errorText(error: unknown): string {
  if (error instanceof AppError) return error.message;
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "email_not_confirmed")
    return "Votre adresse e-mail doit encore être confirmée. Utilisez le dernier e-mail reçu ou demandez un nouvel envoi ci-dessous.";
  if (code === "invalid_credentials")
    return "Adresse e-mail ou mot de passe incorrect. Utilisez les identifiants de votre compte Biguglia Connect. Si nécessaire, choisissez « Mot de passe oublié ? ».";
  if (code === "email_address_not_authorized")
    return "L’envoi d’e-mails n’est pas encore disponible pour cette adresse. Le service d’envoi de Biguglia Connect doit être configuré.";
  if (code === "over_email_send_rate_limit")
    return "La limite d’envoi d’e-mails est atteinte. Patientez avant de demander un nouveau lien.";
  if (code === "otp_expired")
    return "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.";
  const raw = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(raw))
    return "Adresse e-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(raw))
    return "Confirmez votre adresse e-mail avant de vous connecter.";
  if (/error sending (confirmation|recovery|magic link|email)|smtp/i.test(raw))
    return "Le service n’a pas pu envoyer l’e-mail. Réessayez plus tard ; si le problème persiste, contactez l’assistance.";
  if (/rate limit|too many|429/i.test(raw))
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  if (/timeout|abort|timed out|signal|lock/i.test(raw))
    return "Le service met trop de temps à répondre. Vous pouvez réessayer.";
  if (/fetch|network|failed/i.test(raw))
    return "Connexion au service impossible. Vérifiez votre accès Internet puis réessayez.";
  return raw.length < 240
    ? raw
    : "Cette opération a échoué. Réessayez dans un instant.";
}

export async function timedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  let deadlineReached = false;
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener("abort", cancel, { once: true });
  const deadline = setTimeout(() => {
    deadlineReached = true;
    cancel();
  }, 12000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (deadlineReached)
      throw new AppError(
        "Le service met trop de temps à répondre. Vous pouvez réessayer.",
        "request_timeout",
      );
    throw new AppError(errorText(error));
  } finally {
    clearTimeout(deadline);
    init.signal?.removeEventListener("abort", cancel);
  }
}

// One client, one auth storage, no server/browser session race and no async auth callback.
export const authClient = createClient(
  url || "https://configuration.invalid",
  key || "not-configured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "biguglia-connect-v2-session",
      flowType: "pkce",
      lockAcquireTimeout: 8000,
    },
    global: { fetch: timedFetch },
  },
);

export type Row = { id: string; [key: string]: unknown };
export type Query = Record<string, string | number | undefined>;

export async function request<T = Row[]>(
  path: string,
  options: {
    query?: Query;
    body?: unknown;
    method?: string;
    signal?: AbortSignal;
    prefer?: string;
  } = {},
): Promise<T> {
  if (!configured)
    throw new AppError("La connexion à Biguglia Connect doit être configurée.");
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(options.query ?? {}))
    if (value !== undefined) params.set(name, String(value));
  const response = await timedFetch(
    `${apiUrl}/rest/v1/${path}${params.size ? "?" + params : ""}`,
    {
      method: options.method ?? "GET",
      signal: options.signal,
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        Prefer: options.prefer ?? "return=representation",
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    const message =
      response.status === 401
        ? "Votre session a expiré. Reconnectez-vous pour continuer."
        : response.status === 403 || payload.code === "42501"
          ? "Vous ne disposez pas des droits nécessaires pour cette action."
          : payload.code === "23505"
            ? "Cet élément existe déjà. Actualisez la page."
            : payload.code === "23503"
              ? "Cet élément est encore lié à un échange ou une publication."
              : response.status >= 500
                ? "Le service de données est temporairement indisponible. Réessayez dans un instant."
                : ["PGRST202", "PGRST204", "42P01", "42703"].includes(
                      payload.code || "",
                    )
                  ? "Cette fonctionnalité n’est pas disponible pour le moment."
                  : payload.message ||
                    "Impossible de terminer cette opération.";
    throw new AppError(message, payload.code, response.status);
  }
  if (response.status === 204 || options.prefer === "return=minimal")
    return undefined as T;
  return response.json() as Promise<T>;
}
export const rpc = <T = unknown>(name: string, args: Record<string, unknown>) =>
  request<T>(`rpc/${name}`, { method: "POST", body: args });
export const str = (
  row: Record<string, unknown> | null | undefined,
  key: string,
  fallback = "",
) => (row?.[key] == null ? fallback : String(row[key]));
export const num = (row: Record<string, unknown>, key: string) =>
  Number(row[key] ?? 0);
export const safeLocalPath = (value: string | null, fallback = "/") =>
  value?.startsWith("/") && !value.startsWith("//") && !/[\\\r\n]/.test(value)
    ? value
    : fallback;
export const safeUrl = (value: string) => {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
