import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  HeartHandshake,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Wrench,
  ClipboardList,
  HandHeart,
} from "lucide-react";
import { useState } from "react";
import { MODULES, type Module } from "../lib/modules";
import { useQuery } from "../lib/hooks";
import { request, type Row } from "../lib/client";
import {
  PageHeading,
  SectionHeading,
  Empty,
  Failure,
  Loading,
} from "../components/ui";
import { RecordCard } from "./Records";
export default function Home() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const events = MODULES.find((m) => m.slug === "evenements")!;
  const latest = useQuery("home-events", (signal) =>
    request<Row[]>("events", {
      query: {
        select: events.select,
        event_date: `gte.${new Date().toISOString().slice(0, 10)}`,
        status: "in.(a_venir,complet,reporte)",
        order: "event_date.asc,id.asc",
        limit: 3,
      },
      signal,
    }),
  );
  return (
    <>
      <div className="home-greeting">
        <span className="eyebrow">
          <span className="online-dot" />U vostru paese, cunnessu.
        </span>
        <span className="date-label">
          {new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span />À BIGUGLIA, ON SE CONNECTE.
          </div>
          <h1>
            La vie d’ici,
            <br />
            <em>plus proche.</em>
          </h1>
          <p>
            Un artisan de confiance, un objet à partager,
            <br className="desktop-br" /> une sortie entre voisins. Tout
            commence ici.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/recherche?q=" + encodeURIComponent(search));
            }}
          >
            <Search size={21} />
            <input
              aria-label="Rechercher à Biguglia"
              placeholder="De quoi avez-vous besoin ?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button aria-label="Lancer la recherche" type="submit">
              <ArrowRight size={21} />
            </button>
          </form>
          <div className="hero-footnote">
            <HeartHandshake size={17} />
            <span>Local. Utile. Tout simplement.</span>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src="/images/biguglia-village.webp"
            alt="Le village de Biguglia et ses maisons au pied des montagnes"
            fetchPriority="high"
          />
          <div className="photo-caption">
            <MapPin size={16} />
            <span>Biguglia, Haute-Corse</span>
            <span className="photo-stamp">42°37′ N · 9°25′ E</span>
          </div>
          <div className="hero-note">
            <span className="note-icon">
              <Sparkles size={23} />
            </span>
            <div>
              Le meilleur de Biguglia,
              <br />
              <strong>c’est vous.</strong>
            </div>
          </div>
        </div>
      </section>
      <div className="quick-actions">
        <Link to="/artisans">
          <span className="quick-icon clay">
            <Wrench size={22} />
          </span>
          <div>
            <strong>Trouver un artisan</strong>
            <span>Les savoir-faire près de chez vous</span>
          </div>
          <ArrowUpRight size={21} />
        </Link>
        <Link to="/demandes/nouveau">
          <span className="quick-icon sand">
            <ClipboardList size={22} />
          </span>
          <div>
            <strong>Déposer une demande</strong>
            <span>Un projet, un besoin, une solution</span>
          </div>
          <ArrowUpRight size={21} />
        </Link>
        <Link to="/coups-de-main">
          <span className="quick-icon sage">
            <HandHeart size={22} />
          </span>
          <div>
            <strong>Donner un coup de main</strong>
            <span>Entre voisins, c’est plus simple</span>
          </div>
          <ArrowUpRight size={21} />
        </Link>
      </div>
      <section className="section">
        <SectionHeading
          title="Votre quotidien, en plus simple"
          to="/explorer"
          label="Toutes les rubriques"
        />
        <div className="explore-grid">
          {MODULES.filter((m) =>
            [
              "annonces",
              "materiel",
              "evenements",
              "associations",
              "emploi/offres",
              "promenades",
              "perdu-trouve",
              "collectionneurs",
            ].includes(m.slug),
          ).map((m) => (
            <ModuleTile key={m.slug} module={m} />
          ))}
        </div>
      </section>
      <section className="section">
        <SectionHeading title="Les prochains rendez-vous" to="/evenements" />
        <div className="home-events">
          {latest.loading ? (
            <Loading text="Les rendez-vous arrivent…" />
          ) : latest.error ? (
            <Failure message={latest.error} retry={latest.reload} />
          ) : latest.data?.length ? (
            <div className="record-grid three">
              {latest.data.map((row) => (
                <RecordCard key={row.id} module={events} row={row} />
              ))}
            </div>
          ) : (
            <Empty
              title="Le prochain rendez-vous reste à écrire"
              text="Un match, un concert ou une fête de quartier ? Faites-le connaître aux habitants."
              action={
                <Link to="/evenements/nouveau" className="button secondary">
                  <Plus size={17} />
                  Proposer un événement
                </Link>
              }
            />
          )}
        </div>
      </section>
      <section className="community-banner">
        <div>
          <span className="eyebrow">LE LIEN, C’EST NOUS.</span>
          <h2>
            Un petit geste.
            <br />
            Une grande communauté.
          </h2>
          <p>
            Partagez vos idées, vos passions et vos bons plans.
            <br />
            Biguglia se vit mieux ensemble.
          </p>
          <Link to="/communaute" className="button light">
            Rencontrer la communauté
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="community-art" aria-hidden="true">
          <span className="art-circle c1" />
          <span className="art-circle c2" />
          <span className="art-circle c3" />
          <HeartHandshake size={94} strokeWidth={1} />
        </div>
      </section>
    </>
  );
}
export function ModuleTile({ module: m }: { module: Module }) {
  return (
    <Link className="module-tile" to={"/" + m.slug}>
      <span className={`tile-icon ${m.color}`}>
        <m.icon size={25} strokeWidth={1.6} />
      </span>
      <strong>{m.title}</strong>
      <span>{m.description}</span>
      <ArrowUpRight size={18} className="tile-arrow" />
    </Link>
  );
}
export function Explore({ publish = false }: { publish?: boolean }) {
  return (
    <>
      <PageHeading
        eyebrow={
          publish
            ? "Prendre part à la vie locale"
            : "Tout Biguglia, au même endroit"
        }
        title={
          publish ? "Que souhaitez-vous partager ?" : "Explorez la vie d’ici"
        }
        text={
          publish
            ? "Choisissez une rubrique pour créer votre publication."
            : "Des services utiles et des liens qui comptent."
        }
      />
      {["Services", "Vie pratique", "Vie locale", "Communauté"].map((group) => (
        <section className="section" key={group}>
          <SectionHeading title={group} />
          <div className="explore-grid">
            {MODULES.filter((m) => m.group === group).map((m) =>
              publish ? (
                <Link
                  className="publish-tile"
                  to={`/${m.slug}/nouveau`}
                  key={m.slug}
                >
                  <span className={`tile-icon ${m.color}`}>
                    <m.icon size={23} />
                  </span>
                  <div>
                    <strong>Publier {m.singular}</strong>
                    <p>{m.title}</p>
                  </div>
                  <Plus size={20} />
                </Link>
              ) : (
                <ModuleTile key={m.slug} module={m} />
              ),
            )}
          </div>
        </section>
      ))}
    </>
  );
}
