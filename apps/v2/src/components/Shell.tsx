import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Compass,
  Home,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
  MapPin,
  Heart,
  ChevronRight,
} from "lucide-react";
import { MODULES } from "../lib/modules";
import { useAuth, isStaff } from "../lib/auth";
import { str } from "../lib/client";
export default function Shell() {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, profileError, reloadProfile } = useAuth();
  useEffect(() => {
    setMenu(false);
    document.querySelector("main")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const current = MODULES.find((m) =>
    location.pathname.startsWith("/" + m.slug),
  );
  const nav = () => (
    <>
      <NavLink to="/" end className="nav-item">
        <Home size={19} />
        Accueil
      </NavLink>
      {["Services", "Vie pratique", "Vie locale", "Communauté"].map((group) => (
        <div className="nav-group" key={group}>
          <p>{group}</p>
          {MODULES.filter((m) => m.group === group).map((m) => (
            <NavLink
              className="nav-item"
              key={m.slug}
              to={"/" + m.slug}
              end={m.slug === "demandes"}
            >
              <m.icon size={18} />
              {m.title}
            </NavLink>
          ))}
          {group === "Services" && (
            <NavLink className="nav-item" to="/demandes/nouveau">
              <Plus size={18} />
              Poster une demande
            </NavLink>
          )}
        </div>
      ))}
      <div className="nav-group">
        <p>Mon espace</p>
        <NavLink className="nav-item" to="/dashboard">
          <UserRound size={18} />
          Mes activités
        </NavLink>
        <NavLink className="nav-item" to="/favoris">
          <Heart size={18} />
          Mes favoris
        </NavLink>
        <NavLink className="nav-item" to="/dashboard/avis">
          <ShieldCheck size={18} />
          Mes avis
        </NavLink>
        <NavLink className="nav-item" to="/communaute">
          <UsersIcon />
          Communautés
        </NavLink>
        {isStaff(profile) && (
          <NavLink className="nav-item" to="/admin">
            <ShieldCheck size={18} />
            Administration
          </NavLink>
        )}
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      {menu && <div className="drawer-shade" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? "visible" : ""}`}>
        <Link className="brand" to="/" aria-label="Biguglia Connect, accueil">
          <span className="brand-mark">
            b<span>c</span>
            <i />
          </span>
          <span>
            biguglia<strong>connect</strong>
          </span>
        </Link>
        <button
          className="icon-button drawer-close"
          onClick={() => setMenu(false)}
          aria-label="Fermer le menu"
        >
          <X />
        </button>
        <div className="sidebar-place">
          <span className="online-dot" />
          <span>La vie d’ici, ensemble.</span>
        </div>
        <nav aria-label="Navigation principale">{nav()}</nav>
        <div className="sidebar-bottom">
          <span>Fattu per Biguglia.</span>
          <Link to="/aide">
            Besoin d’un coup de main ?<ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Ouvrir le menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumbs">
              Biguglia
              <ChevronRight size={14} />
              <strong>
                {current?.title ||
                  ({
                    "/dashboard": "Mon espace",
                    "/messages": "Messagerie",
                    "/profil": "Mon profil",
                    "/admin": "Administration",
                  }[location.pathname] ??
                    "Accueil")}
              </strong>
            </span>
          </div>
          <div className="top-actions">
            <span className="location-tag">
              <MapPin size={14} />
              Haute-Corse
            </span>
            <Link
              className="icon-button"
              aria-label="Notifications"
              to="/notifications"
            >
              <Bell size={20} />
            </Link>
            <Link
              className="icon-button desktop-message"
              aria-label="Messages"
              to="/messages"
            >
              <MessageCircle size={20} />
            </Link>
            <Link
              className="avatar"
              aria-label={session ? "Mon profil" : "Se connecter"}
              to={session ? "/profil" : "/connexion"}
            >
              {session ? (
                (str(profile, "full_name") || session.user.email || "B")
                  .charAt(0)
                  .toUpperCase()
              ) : (
                <UserRound size={20} />
              )}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {profileError && (
            <div className="notice warning">
              <p>Votre session est ouverte. {profileError}</p>
              <button className="text-button" onClick={reloadProfile}>
                Recharger le profil
              </button>
            </div>
          )}
          <Outlet />
        </main>
        <footer className="footer">
          <span>Biguglia Connect · Les liens font le lieu.</span>
          <div>
            <Link to="/aide">Aide</Link>
            <Link to="/regles">Règles</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
          </div>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        <NavLink to="/" end>
          <Home size={21} />
          Accueil
        </NavLink>
        <NavLink to="/explorer">
          <Compass size={21} />
          Explorer
        </NavLink>
        <button onClick={() => navigate("/publier")}>
          <span className="mobile-add">
            <Plus size={24} />
          </span>
          Publier
        </button>
        <NavLink to="/messages">
          <MessageCircle size={21} />
          Messages
        </NavLink>
        <NavLink to={session ? "/dashboard" : "/connexion"}>
          <UserRound size={21} />
          Compte
        </NavLink>
      </nav>
    </div>
  );
}
function UsersIcon() {
  return <Compass size={18} />;
}
