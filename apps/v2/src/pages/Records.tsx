import { useState, useRef, type FormEvent } from "react";
import { formatPrice, formatDate } from "../lib/format";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
  Share2,
  Flag,
} from "lucide-react";
import { useAuth, isStaff } from "../lib/auth";
import {
  request,
  rpc,
  errorText,
  str,
  num,
  type Row,
  safeUrl,
} from "../lib/client";
import { useQuery } from "../lib/hooks";
import {
  buildPayload,
  label,
  locationText,
  moduleTitle,
  recordImage,
  SECTORS,
  type Field,
  type Module,
} from "../lib/modules";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  Modal,
  NotFound,
  Notice,
  PageHeading,
} from "../components/ui";
import { LoanActivity } from "./Equipment";
import { Appointments } from "./Appointments";
import {
  Participation,
  EquipmentRequest,
  Comments,
  Photos,
  Rating,
  ReportDialog,
  FavoriteButton,
} from "./actions";

export function RecordCard({ module: m, row }: { module: Module; row: Row }) {
  const image = recordImage(row);
  const Icon = m.icon;
  return (
    <article className="record-card">
      <Link
        className={`card-visual ${m.color} ${image ? "has-image" : ""}`}
        to={`/${m.slug}/${row.id}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {image && safeUrl(image) ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <>
            <Icon size={47} strokeWidth={1} />
            <span className="visual-circle" />
          </>
        )}
        <span className="card-category">{m.title}</span>
        {row.is_verified === true && (
          <span className="verified">
            <ShieldCheck size={14} />
            Vérifié
          </span>
        )}
      </Link>
      <div className="card-body">
        <div className="card-meta">
          {row.event_date || row.outing_date ? (
            <>
              <CalendarDays size={13} />
              {formatDate(String(row.event_date || row.outing_date))}
            </>
          ) : (
            <>
              <MapPin size={13} />
              {locationText(row)}
            </>
          )}
        </div>
        <h3>
          <Link to={`/${m.slug}/${row.id}`}>{moduleTitle(m, row)}</Link>
        </h3>
        <p>
          {str(row, m.descriptionField) ||
            str(row, "short_description") ||
            "Découvrez cette publication et échangez avec son auteur."}
        </p>
        <div className="card-bottom">
          <span className="status">
            {row.price !== undefined && num(row, "price") > 0
              ? formatPrice(num(row, "price"))
              : row.is_free === true || row.listing_type === "free"
                ? "Gratuit"
                : row.status
                  ? label(row.status)
                  : m.title}
          </span>
          <Link
            to={`/${m.slug}/${row.id}`}
            className="card-arrow"
            aria-label={`Voir ${moduleTitle(m, row)}`}
          >
            <ArrowUpRightIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={19} />;
}
export { formatPrice, formatDate } from "../lib/format";

export function RecordList({ module: m }: { module: Module }) {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const q = params.get("q") || "",
    sector = params.get("secteur") || "",
    cat = params.get("categorie") || "",
    page = Math.max(0, Number(params.get("page") || 0) || 0),
    own = params.get("mes") === "1";
  const allowed = !m.authOnly || !!session;
  const rows = useQuery(
    `${m.slug}:${params}:${session?.user.id || ""}`,
    (signal) =>
      request<Row[]>(m.table, {
        query: {
          select: m.select,
          ...(own ? { [m.owner]: `eq.${session?.user.id}` } : m.publicFilter),
          ...(q
            ? {
                [m.titleField]: `ilike.*${q.replace(/[*,().%_]/g, " ").slice(0, 100)}*`,
              }
            : {}),
          ...(sector && m.sector === "sector_id"
            ? { sector_id: `eq.${sector}` }
            : {}),
          ...(cat && m.categoryField ? { [m.categoryField]: `eq.${cat}` } : {}),
          order: "created_at.desc,id.desc",
          limit: 25,
          offset: page * 24,
        },
        signal,
      }),
    allowed && (!own || !!session),
  );
  const cats = useQuery(
    "categories-" + m.categoryTable,
    (signal) =>
      request<Row[]>(m.categoryTable!, {
        query: { select: "id,name", order: "name.asc", limit: 100 },
        signal,
      }),
    !!m.categoryTable,
  );
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  return (
    <>
      <PageHeading
        eyebrow={m.group}
        title={m.title}
        text={m.description}
        action={
          <Link className="button" to={`/${m.slug}/nouveau`}>
            <Plus size={18} />
            Publier {m.singular}
          </Link>
        }
      />
      {m.slug.startsWith("emploi/") && (
        <div className="tabs">
          <Link
            className={m.slug === "emploi/offres" ? "active" : ""}
            to="/emploi/offres"
          >
            Offres d’emploi
          </Link>
          <Link
            className={m.slug === "emploi/demandes" ? "active" : ""}
            to="/emploi/demandes"
          >
            Candidatures locales
          </Link>
        </div>
      )}
      <div className="filters">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            change("q", search);
          }}
        >
          <Search size={18} />
          <input
            aria-label={`Rechercher dans ${m.title}`}
            placeholder="Que recherchez-vous ?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Rechercher</button>
        </form>
        {m.sector === "sector_id" && (
          <select
            aria-label="Filtrer par quartier"
            value={sector}
            onChange={(e) => change("secteur", e.target.value)}
          >
            <option value="">Tous les quartiers</option>
            {SECTORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {m.categoryTable && (
          <select
            aria-label="Filtrer par catégorie"
            value={cat}
            onChange={(e) => change("categorie", e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {str(c, "name")}
              </option>
            ))}
          </select>
        )}
        {session && (
          <button
            className={`filter-toggle ${own ? "selected" : ""}`}
            onClick={() => change("mes", own ? "" : "1")}
          >
            Mes publications
          </button>
        )}
      </div>
      {!allowed || (own && !session) ? (
        <LoginPrompt text="Connectez-vous pour consulter les demandes et préserver les coordonnées des habitants." />
      ) : rows.loading ? (
        <Loading />
      ) : rows.error ? (
        <Failure message={rows.error} retry={rows.reload} />
      ) : !rows.data?.length ? (
        <Empty
          title={
            q || sector || cat
              ? "Aucun résultat pour ces critères"
              : "La place est libre pour votre publication"
          }
          text={
            q || sector || cat
              ? "Essayez un autre mot ou un quartier différent."
              : `Partagez ${m.singular} avec les habitants de Biguglia.`
          }
          action={
            <Link className="button secondary" to={`/${m.slug}/nouveau`}>
              <Plus size={17} />
              Créer une publication
            </Link>
          }
        />
      ) : (
        <>
          <div className="results-caption">
            {own ? "Vos publications" : "Les dernières publications"}
            <span>
              {sector
                ? SECTORS.find((s) => s.value === sector)?.label
                : "À Biguglia et aux alentours"}
            </span>
          </div>
          <div className="record-grid">
            {rows.data.slice(0, 24).map((row) => (
              <RecordCard key={row.id} module={m} row={row} />
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={!page}
              className="button secondary"
              onClick={() => change("page", String(page - 1))}
            >
              <ChevronLeft size={17} />
              Précédent
            </button>
            <span>Page {page + 1}</span>
            <button
              disabled={rows.data.length <= 24}
              className="button secondary"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("page", String(page + 1));
                setParams(next);
              }}
            >
              Suivant
              <ChevronRight size={17} />
            </button>
          </div>
        </>
      )}
    </>
  );
}

function FieldInput({
  field: f,
  value,
  onChange,
  options,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  options?: Row[];
}) {
  const common = { id: f.name, name: f.name, required: f.required };
  return (
    <div
      className={`form-field ${f.type === "textarea" ? "wide" : ""} ${f.type === "checkbox" ? "check-field" : ""}`}
    >
      <label htmlFor={f.name}>
        {f.type === "checkbox" ? (
          <input
            {...common}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        ) : null}
        {f.label}
        {f.required && <span aria-hidden="true"> *</span>}
      </label>
      {f.type === "checkbox" ? null : f.type === "textarea" ? (
        <textarea
          {...common}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          minLength={f.min}
          maxLength={f.max || 8000}
          rows={5}
        />
      ) : f.type === "select" ? (
        <select
          {...common}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choisir…</option>
          {(
            f.options ||
            options?.map((o) => ({ value: o.id, label: str(o, "name") }))
          )?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={f.type || "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          min={f.type === "number" ? f.min : undefined}
          max={f.type === "number" ? f.max : undefined}
          minLength={f.type !== "number" ? f.min : undefined}
          maxLength={f.type !== "number" ? f.max || 500 : undefined}
          step={f.type === "number" ? "any" : undefined}
        />
      )}{" "}
      {f.hint && <small>{f.hint}</small>}
    </div>
  );
}

export function RecordForm({
  module: m,
  editing = false,
}: {
  module: Module;
  editing?: boolean;
}) {
  const { id } = useParams();
  const [formParams] = useSearchParams();
  const targetArtisan = formParams.get("artisan");
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, unknown>>({ ...m.defaults });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lookups = [
    ...new Set(m.fields.flatMap((f) => (f.lookup ? [f.lookup] : []))),
  ];
  const data = useQuery(
    `${m.slug}-form-${id || ""}`,
    async (signal) => {
      const groups = await Promise.all(
        lookups.map(
          async (table) =>
            [
              table,
              await request<Row[]>(table, {
                query: { select: "id,name", order: "name.asc", limit: 100 },
                signal,
              }),
            ] as const,
        ),
      );
      const artisan =
        targetArtisan && m.table === "service_requests"
          ? await request<Row[]>("artisan_profiles", {
              query: {
                select: "id,business_name,is_verified",
                id: `eq.${targetArtisan}`,
                is_verified: "eq.true",
                limit: 1,
              },
              signal,
            })
          : [];
      if (targetArtisan && m.table === "service_requests" && !artisan[0])
        throw new Error(
          "Cet artisan n’est pas disponible pour une demande de devis.",
        );
      const current = editing
        ? await request<Row[]>(m.table, {
            query: {
              select: [
                ...new Set([
                  ...m.select.split(","),
                  ...m.fields.map((f) => f.name),
                ]),
              ].join(","),
              id: `eq.${id}`,
              limit: 1,
            },
            signal,
          })
        : [];
      if (editing && current[0]) {
        setForm(current[0]);
        setLoaded(true);
      }
      return {
        lookups: Object.fromEntries(groups),
        current: current[0],
        artisan: artisan[0],
      };
    },
    !!session,
  );
  if (!session)
    return (
      <LoginPrompt text="Connectez-vous pour publier et retrouver vos échanges." />
    );
  if (data.loading) return <Loading />;
  if (data.error) return <Failure message={data.error} retry={data.reload} />;
  if (
    editing &&
    (!data.data?.current ||
      (str(data.data.current, m.owner) !== session.user.id &&
        !isStaff(profile)))
  )
    return <NotFound />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = buildPayload(m, form, session.user.id, editing);
      if (m.table === "artisan_profiles" && !editing)
        payload.is_verified = false;
      if (m.table === "service_requests" && !editing && data.data?.artisan)
        payload.artisan_id = data.data.artisan.id;
      const rows = await request<Row[]>(m.table, {
        method: editing ? "PATCH" : "POST",
        query: editing ? { id: `eq.${id}` } : undefined,
        body: payload,
      });
      if (!rows[0])
        throw new Error(
          "L’enregistrement n’a pas été confirmé. Actualisez avant de réessayer.",
        );
      if (m.table === "artisan_profiles" && !editing) {
        setSaved(
          "Votre profil artisan est enregistré. Il sera visible après vérification par l’équipe.",
        );
      } else navigate(`/${m.slug}/${rows[0].id}`, { replace: true });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link className="back-link" to={`/${m.slug}`}>
        <ArrowLeft size={17} />
        Retour à {m.title.toLowerCase()}
      </Link>
      <PageHeading
        eyebrow={editing ? "Mettre à jour" : "Partager avec les habitants"}
        title={editing ? "Modifier votre publication" : `Publier ${m.singular}`}
        text="Les champs marqués d’un astérisque sont obligatoires."
      />
      {saved ? (
        <Notice>
          {saved}
          <p>
            <Link to="/dashboard">Retrouver mes activités</Link>
          </p>
        </Notice>
      ) : (
        <form className="editor" onSubmit={submit}>
          <div className="editor-main">
            <div className="form-section">
              <h2>Les informations essentielles</h2>
              {data.data?.artisan && (
                <div className="notice success">
                  Demande de devis privée pour{" "}
                  {str(data.data.artisan, "business_name")}.
                </div>
              )}
              <div className="form-grid">
                {m.fields.map((f) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    value={form[f.name]}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, [f.name]: value }))
                    }
                    options={
                      f.lookup ? data.data?.lookups[f.lookup] : undefined
                    }
                  />
                ))}
                {m.sector === "sector_id" && (
                  <FieldInput
                    field={{
                      name: "sector_id",
                      label: "Quartier",
                      type: "select",
                      options: SECTORS,
                    }}
                    value={form.sector_id}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, sector_id: value }))
                    }
                  />
                )}
              </div>
            </div>
            {error && <Failure message={error} />}
            <div className="form-actions">
              <Link className="button secondary" to={`/${m.slug}`}>
                Annuler
              </Link>
              <button className="button" type="submit" disabled={busy}>
                {busy
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer les modifications"
                    : "Publier"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <aside className="editor-aside">
            <span className={`tile-icon ${m.color}`}>
              <m.icon size={26} />
            </span>
            <h3>Une publication utile commence par les détails.</h3>
            <p>
              Décrivez clairement votre besoin, l’objet ou votre projet.
              Précisez le lieu et les disponibilités.
            </p>
            <div className="aside-rule">
              <ShieldCheck size={19} />
              <p>Gardez vos coordonnées personnelles dans la messagerie.</p>
            </div>
            {m.photo && (
              <p>Vous pourrez ajouter vos photos après l’enregistrement.</p>
            )}
            <Link className="text-button" to="/regles">
              Les règles de la communauté
              <ArrowRight size={15} />
            </Link>
          </aside>
        </form>
      )}
    </>
  );
}

export function RecordDetail({ module: m }: { module: Module }) {
  const { id } = useParams();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState(false);
  const [content, setContent] = useState("");
  const firstMessage = useRef(crypto.randomUUID());
  const [shareNotice, setShareNotice] = useState("");
  const query = useQuery(
    `${m.slug}-${id}-${session?.user.id || ""}`,
    (signal) =>
      request<Row[]>(m.table, {
        query: { select: m.select, id: `eq.${id}`, limit: 1 },
        signal,
      }),
    !m.authOnly || !!session,
  );
  if (m.authOnly && !session) return <LoginPrompt />;
  if (query.loading) return <Loading />;
  if (query.error)
    return <Failure message={query.error} retry={query.reload} />;
  const row = query.data?.[0];
  if (!row) return <NotFound />;
  const owner = str(row, m.owner),
    isOwner = owner === session?.user.id,
    canEdit = isOwner || isStaff(profile);
  const contact = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) {
      navigate("/connexion?next=" + encodeURIComponent(location.pathname));
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const conversationId = await rpc<string>("bc_v2_start_conversation", {
        p_subject: moduleTitle(m, row),
        p_type: m.context,
        p_record: row.id,
        p_recipient: owner,
        p_content: content.trim(),
        p_message_id: firstMessage.current,
      });
      if (!conversationId)
        throw new Error("La conversation n’a pas été créée.");
      navigate("/messages/" + conversationId);
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const status = async (value: string) => {
    setBusy(true);
    setActionError("");
    try {
      const result = await request<Row[]>(m.table, {
        method: "PATCH",
        query: { id: `eq.${id}` },
        body: {
          status: value,
          ...(m.table === "equipment_items"
            ? { is_available: value === "disponible" }
            : {}),
        },
      });
      if (!result.length)
        throw new Error("La modification n’a pas été confirmée.");
      query.reload();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link className="back-link" to={`/${m.slug}`}>
        <ArrowLeft size={17} />
        {m.title}
      </Link>
      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-meta">
            <span className={`badge ${m.color}`}>{m.title}</span>
            {row.status != null && (
              <span className="badge neutral">{label(row.status)}</span>
            )}
            {row.is_verified === true && (
              <span className="badge sage">
                <ShieldCheck size={14} />
                Artisan vérifié
              </span>
            )}
          </div>
          <h1>{moduleTitle(m, row)}</h1>
          <div className="detail-facts">
            <span>
              <MapPin size={16} />
              {locationText(row)}
            </span>
            <span>
              <Clock3 size={16} />
              Publié le {formatDate(str(row, "created_at"))}
            </span>
          </div>
          {m.photo && <Photos module={m} row={row} canEdit={canEdit} />}
          <div className="description">
            {str(row, m.descriptionField) ||
              str(row, "short_description") ||
              "Aucune description complémentaire."}
          </div>
          <dl className="details-grid">
            {m.fields
              .filter(
                (f) =>
                  !["title", m.titleField, m.descriptionField].includes(
                    f.name,
                  ) &&
                  row[f.name] != null &&
                  row[f.name] !== "" &&
                  f.type !== "textarea" &&
                  f.type !== "checkbox" &&
                  f.type !== "select",
              )
              .map((f) => (
                <div key={f.name}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.type === "date"
                      ? formatDate(str(row, f.name))
                      : str(row, f.name)}
                  </dd>
                </div>
              ))}
          </dl>
          {m.table === "events" && (
            <Participation type="event" row={row} owner={owner} />
          )}{" "}
          {m.table === "group_outings" && (
            <Participation type="outing" row={row} owner={owner} />
          )}{" "}
          {m.table === "equipment_items" && !isOwner && (
            <EquipmentRequest row={row} />
          )}
          {m.table === "equipment_items" && session && (
            <LoanActivity equipmentId={row.id} onChange={query.reload} />
          )}{" "}
          {m.table === "help_requests" && !isOwner && (
            <Participation type="help" row={row} owner={owner} />
          )}{" "}
          {m.table === "service_requests" && !!row.artisan_id && (
            <Appointments row={row} onChange={query.reload} />
          )}
          {m.comment && <Comments module={m} row={row} />}
          <Rating module={m} row={row} />
        </article>
        <aside className="detail-aside">
          <div className="contact-card">
            <span className={`tile-icon ${m.color}`}>
              <m.icon size={26} />
            </span>
            <h2>
              {isOwner
                ? "Votre publication"
                : m.table === "artisan_profiles"
                  ? "Parlons de votre projet"
                  : "Envie d’en savoir plus ?"}
            </h2>
            <p>
              {isOwner
                ? "Gérez les informations et le suivi de votre publication."
                : "Échangez directement avec l’auteur dans la messagerie Biguglia Connect."}
            </p>
            {!isOwner &&
              m.table === "artisan_profiles" &&
              row.is_verified === true && (
                <Link
                  className="button secondary full"
                  to={"/demandes/nouveau?artisan=" + row.id}
                >
                  Demander un devis
                </Link>
              )}
            {!isOwner && (
              <button
                className="button full"
                onClick={() =>
                  session
                    ? setMessage(true)
                    : navigate(
                        "/connexion?next=" +
                          encodeURIComponent(location.pathname),
                      )
                }
              >
                <MessageCircle size={18} />
                Contacter
              </button>
            )}
            {canEdit && (
              <>
                <Link
                  className="button secondary full"
                  to={`/${m.slug}/${row.id}/modifier`}
                >
                  <Pencil size={17} />
                  Modifier
                </Link>
                <button
                  className="text-button danger"
                  onClick={() => setDeleting(true)}
                >
                  Supprimer la publication
                </button>
                {m.statuses && (
                  <label className="form-field">
                    État de la publication
                    <select
                      value={str(row, "status")}
                      disabled={
                        busy ||
                        (m.table === "equipment_items" &&
                          ["reserve", "prete"].includes(str(row, "status")))
                      }
                      onChange={(e) => void status(e.target.value)}
                    >
                      {m.statuses
                        .filter(
                          (s) =>
                            m.table !== "equipment_items" ||
                            [
                              "disponible",
                              "indisponible",
                              "archive",
                              str(row, "status"),
                            ].includes(s.value),
                        )
                        .map((s) => (
                          <option value={s.value} key={s.value}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <div className="detail-buttons">
              <FavoriteButton module={m} row={row} />
              <button
                className="icon-button"
                aria-label="Partager cette publication"
                onClick={() =>
                  void (async () => {
                    try {
                      if (navigator.share)
                        await navigator.share({
                          title: moduleTitle(m, row),
                          url: location.href,
                        });
                      else {
                        await navigator.clipboard.writeText(location.href);
                        setShareNotice("Lien copié.");
                      }
                    } catch {
                      setShareNotice("Le partage n’a pas abouti.");
                    }
                  })()
                }
              >
                <Share2 size={19} />
              </button>
              {!isOwner && (
                <button
                  className="icon-button"
                  aria-label="Signaler cette publication"
                  onClick={() => setReport(true)}
                >
                  <Flag size={18} />
                </button>
              )}
            </div>
            {shareNotice && <p role="status">{shareNotice}</p>}
            {actionError && <Failure message={actionError} />}
          </div>
          <div className="trust-note">
            <ShieldCheck size={21} />
            <p>
              Privilégiez la messagerie pour convenir des détails et restez
              vigilant lors des échanges.
            </p>
            <Link to="/confiance">Nos conseils</Link>
          </div>
        </aside>
      </div>
      {message && (
        <Modal
          title="Commencer la conversation"
          onClose={() => setMessage(false)}
        >
          <form onSubmit={contact}>
            <label className="form-field">
              Votre message
              <textarea
                required
                minLength={3}
                maxLength={5000}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Bonjour, votre publication m’intéresse…"
              />
            </label>
            {actionError && <Failure message={actionError} />}
            <button
              className="button full"
              disabled={busy || content.trim().length < 3}
            >
              {busy ? "Envoi…" : "Envoyer le message"}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Supprimer cette publication"
          onClose={() => setDeleting(false)}
        >
          <p>
            Cette suppression est définitive. Saisissez le titre de la
            publication pour confirmer.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setBusy(true);
                setActionError("");
                try {
                  const deleted = await request<Row[]>(m.table, {
                    method: "DELETE",
                    query: {
                      id: `eq.${row.id}`,
                      ...(!isStaff(profile)
                        ? { [m.owner]: `eq.${session?.user.id}` }
                        : {}),
                    },
                  });
                  if (!deleted.length)
                    throw new Error("La suppression n’a pas été confirmée.");
                  navigate("/dashboard");
                } catch (e) {
                  setActionError(errorText(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            <label className="form-field">
              Titre à confirmer
              <input
                required
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
            </label>
            {actionError && <Failure message={actionError} />}
            <button
              className="button full"
              disabled={busy || deleteConfirm !== moduleTitle(m, row)}
            >
              {busy ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </form>
        </Modal>
      )}
      {report && (
        <ReportDialog module={m} row={row} close={() => setReport(false)} />
      )}
    </>
  );
}
