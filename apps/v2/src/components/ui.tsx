import { Component, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
export function Loading({ text = "Chargement…" }: { text?: string }) {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={25} />
      <span>{text}</span>
    </div>
  );
}
export function Failure({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>Le chargement n’a pas abouti</strong>
        <p>{message}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            <RefreshCw size={15} />
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Rien à afficher pour le moment",
  text = "Les prochaines publications apparaîtront ici.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  title,
  to,
  label = "Tout voir",
}: {
  title: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {to && (
        <Link to={to} className="text-button">
          {label}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice success" role="status">
      <CheckCircle2 size={21} />
      <div>{children}</div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(
      '[role="dialog"]',
    ) as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") latestClose.current();
      if (event.key === "Tab") {
        const nodes = focusable();
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previousOverflow;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="modal-heading">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>La page a rencontré une erreur</h1>
        <p>Vos données enregistrées sont conservées.</p>
        <button className="button" onClick={() => window.location.assign("/")}>
          Revenir à l’accueil
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function LoginPrompt({
  text = "Connectez-vous pour continuer.",
}: {
  text?: string;
}) {
  const next = window.location.pathname + window.location.search;
  return (
    <Empty
      title="Retrouvons-nous ici"
      text={text}
      action={
        <Link
          className="button"
          to={`/connexion?next=${encodeURIComponent(next)}`}
        >
          Se connecter
          <ArrowRight size={17} />
        </Link>
      }
    />
  );
}
export function NotFound() {
  return (
    <Empty
      title="Cette page est introuvable"
      text="Le lien a peut-être changé ou cette publication a été retirée."
      action={
        <Link className="button" to="/">
          Retour à l’accueil
        </Link>
      }
    />
  );
}
