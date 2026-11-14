import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import {
  authClient,
  configured,
  safeLocalPath,
} from "../lib/client";
import { authFeedback } from "../lib/authFeedback";
import { useAuth } from "../lib/auth";
import { authRedirect } from "../components/NativeBridge";
import { Failure, Loading, Notice } from "../components/ui";
export default function Auth({
  mode = "login",
}: {
  mode?: "login" | "signup" | "password" | "callback";
}) {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof authFeedback> | null>(null);
  const [notice, setNotice] = useState("");
  const next = safeLocalPath(params.get("next"), "/dashboard");
  const recovery = mode === "password" && params.get("recovery") === "1";
  const callbackFragment = new URLSearchParams(location.hash.slice(1));
  const invalidCallback = [params, callbackFragment].some(
    (values) => values.has("error") || values.has("error_code"),
  );
  useEffect(() => {
    if (session && (mode === "login" || mode === "callback"))
      navigate(next, { replace: true });
  }, [session, mode, navigate, next]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      if (!configured)
        throw new Error("Le service de connexion n’est pas encore configuré.");
      if (mode === "login") {
        const result = await authClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error) throw result.error;
        if (!result.data.session)
          throw new Error("La connexion n’a pas été confirmée.");
        navigate(next, { replace: true });
      }
      if (mode === "signup") {
        if (!consent)
          throw new Error("Votre accord sur les conditions est nécessaire.");
        if (password !== confirmation)
          throw new Error("Les deux mots de passe ne correspondent pas.");
        const result = await authClient.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim(), legal_consent: true },
            emailRedirectTo: authRedirect("/auth/callback"),
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) navigate("/dashboard", { replace: true });
        else
          setNotice(
            "Votre demande a été prise en compte. Pour une nouvelle inscription, consultez votre boîte de réception et vos courriers indésirables afin de confirmer votre adresse. Si vous avez déjà un compte, connectez-vous ou utilisez « Mot de passe oublié ? » : aucun nouvel e-mail de confirmation n’est nécessaire pour un compte déjà confirmé.",
          );
      }
      if (mode === "password" && !recovery) {
        const result = await authClient.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: authRedirect("/mot-de-passe?recovery=1") },
        );
        if (result.error) throw result.error;
        setNotice(
          "Si un compte correspond à cette adresse, un lien pour changer le mot de passe vous a été envoyé.",
        );
      }
      if (recovery) {
        if (password !== confirmation)
          throw new Error("Les deux mots de passe ne correspondent pas.");
        const result = await authClient.auth.updateUser({ password });
        if (result.error) throw result.error;
        setNotice("Votre nouveau mot de passe est enregistré.");
        setPassword("");
        setConfirmation("");
      }
    } catch (e) {
      setError(
        authFeedback(
          e,
          mode === "signup"
            ? "signup"
            : mode === "password" && !recovery
              ? "email"
              : "other",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  if (mode === "callback")
    return (
      <div className="auth-callback">
        {loading || session ? (
          <Loading text="Confirmation de votre session…" />
        ) : (
          <>
            <h1>
              {invalidCallback
                ? "Ce lien ne peut pas être utilisé"
                : "Votre connexion n’a pas été confirmée"}
            </h1>
            <p>
              {invalidCallback
                ? "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien depuis la connexion et utilisez le dernier e-mail reçu."
                : "Ouvrez le lien reçu par e-mail pour terminer la confirmation. Si votre compte est déjà confirmé, connectez-vous avec votre adresse e-mail et votre mot de passe."}
            </p>
            <Link className="button" to="/connexion">
              Se connecter
            </Link>
          </>
        )}
      </div>
    );
  return (
    <div className="auth-layout">
      <section className="auth-art">
        <img
          src="/images/biguglia-etang.webp"
          alt="L’étang de Biguglia et les montagnes de Haute-Corse"
        />
        <div className="auth-art-copy">
          <Leaf size={28} />
          <h2>
            On est bien,
            <br />
            <em>entre voisins.</em>
          </h2>
          <p>
            Les bonnes rencontres commencent
            <br />
            tout près de chez vous.
          </p>
        </div>
        <span className="auth-art-place">
          L’étang de Biguglia · Haute-Corse
        </span>
      </section>
      <section className="auth-form">
        <span className="eyebrow">BIENVENUE CHEZ VOUS</span>
        <h1>
          {mode === "signup"
            ? "Rejoignez la vie d’ici."
            : mode === "password"
              ? "Un nouveau départ."
              : "Heureux de vous retrouver."}
        </h1>
        <p>
          {mode === "signup"
            ? "Un seul compte pour participer à toute la vie locale."
            : mode === "password"
              ? "Retrouvez l’accès à votre compte en toute simplicité."
              : "Connectez-vous pour retrouver vos échanges et vos projets."}
        </p>
        {notice && <Notice>{notice}</Notice>}
        {recovery && loading ? (
          <Loading text="Vérification du lien de récupération…" />
        ) : recovery && !session ? (
          <Notice>
            Ce lien ne permet pas de changer votre mot de passe. Demandez un
            nouveau lien et ouvrez le dernier e-mail reçu.
            <Link className="button" to="/mot-de-passe">Recevoir un nouveau lien</Link>
          </Notice>
        ) : (
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label className="form-field">
                Votre nom
                <input
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {!recovery && (
              <label className="form-field">
                Adresse e-mail
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                />
              </label>
            )}
            {(mode !== "password" || recovery) && (
              <>
                <label className="form-field">
                  Mot de passe
                  <div className="password-input">
                    <input
                      aria-label="Mot de passe"
                      aria-describedby={
                        mode === "login" ? undefined : "password-hint"
                      }
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      type={visible ? "text" : "password"}
                      required
                      minLength={mode === "login" ? 1 : 12}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        visible
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {mode !== "login" && (
                    <small id="password-hint">
                      Au moins 12 caractères. Utilisez un mot de passe unique.
                    </small>
                  )}
                </label>
                {(mode === "signup" || recovery) && (
                  <label className="form-field">
                    Confirmez le mot de passe
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}
            {mode === "login" && (
              <div className="forgot">
                <Link to="/mot-de-passe">Mot de passe oublié ?</Link>
              </div>
            )}
            {mode === "signup" && (
              <label className="consent">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  J’accepte les{" "}
                  <Link to="/cgu" target="_blank">
                    conditions d’utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link to="/confidentialite" target="_blank">
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
            )}
            {error && <Failure title={error.title} message={error.message} />}
            <button type="submit" className="button full" disabled={busy}>
              {busy
                ? "Un instant…"
                : mode === "login"
                  ? "Se connecter"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : recovery
                      ? "Enregistrer le nouveau mot de passe"
                      : "Recevoir le lien"}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <Link to="/inscription">Rejoindre Biguglia Connect</Link>
            </>
          ) : (
            <Link to="/connexion">Revenir à la connexion</Link>
          )}
        </div>
        {mode === "login" && (
          <button
            className="text-button resend"
            onClick={() =>
              void (async () => {
                if (busy) return;
                setError(null);
                setNotice("");
                if (!email.trim()) {
                  setError({
                    title: "Adresse e-mail manquante",
                    message: "Saisissez d’abord votre adresse e-mail.",
                  });
                  return;
                }
                setBusy(true);
                try {
                  if (!configured)
                    throw new Error("Le service de connexion n’est pas encore configuré.");
                  const result = await authClient.auth.resend({
                    type: "signup",
                    email: email.trim(),
                    options: {
                      emailRedirectTo: authRedirect("/auth/callback"),
                    },
                  });
                  if (result.error) throw result.error;
                  setNotice(
                    "Si cette adresse attend encore une confirmation, un nouvel e-mail a été demandé. Consultez aussi vos courriers indésirables. Pour un compte déjà confirmé, connectez-vous ou utilisez « Mot de passe oublié ? ».",
                  );
                } catch (e) {
                  setError(authFeedback(e, "email"));
                } finally {
                  setBusy(false);
                }
              })()
            }
            disabled={busy}
          >
            Renvoyer l’e-mail de confirmation
          </button>
        )}
        <div className="auth-security">
          <ShieldCheck size={16} />
          Vos échanges restent entre vous.
        </div>
      </section>
    </div>
  );
}
