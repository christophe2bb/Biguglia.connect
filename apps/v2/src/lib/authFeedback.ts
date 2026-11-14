import { AppError, errorText } from "./client";

export function authFeedback(
  error: unknown,
  operation: "email" | "signup" | "other" = "other",
) {
  const message = error instanceof Error ? error.message : String(error);
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  // The SDK may wrap a transport error and discard its original code.
  // Aborting the client request does not undo work already accepted by Auth.
  const unconfirmed =
    (error instanceof AppError && error.code === "request_timeout") ||
    name === "AuthRetryableFetchError" ||
    /timeout|timed out|aborted|lock.*acquir|failed to fetch|networkerror|trop de temps/i.test(
      message,
    );
  if (unconfirmed && operation === "email")
    return {
      title: "Envoi non confirmé",
      message:
        "La réponse du serveur n’a pas été reçue. L’e-mail peut avoir été envoyé. Consultez votre boîte de réception et vos courriers indésirables avant de demander un autre lien.",
    };
  if (unconfirmed && operation === "signup")
    return {
      title: "Inscription non confirmée",
      message:
        "La réponse du serveur n’a pas été reçue. Votre inscription peut avoir été enregistrée. Vérifiez si vous avez reçu un e-mail de confirmation avant de recommencer.",
    };
  return { title: "La demande n’a pas abouti", message: errorText(error) };
}
