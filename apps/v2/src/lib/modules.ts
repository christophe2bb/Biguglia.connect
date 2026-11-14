import {
  Wrench,
  ClipboardList,
  ShoppingBag,
  Drill,
  Gem,
  Search,
  CalendarDays,
  Footprints,
  MessagesSquare,
  HandHeart,
  Users,
  BriefcaseBusiness,
  Map,
  type LucideIcon,
} from "lucide-react";
import { type Row, str } from "./client";
export type Option = { value: string; label: string };
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "select"
    | "number"
    | "date"
    | "time"
    | "checkbox"
    | "email"
    | "url";
  required?: boolean;
  options?: Option[];
  lookup?: string;
  min?: number;
  max?: number;
  hint?: string;
};
export type Module = {
  slug: string;
  title: string;
  singular: string;
  description: string;
  group: string;
  icon: LucideIcon;
  color: string;
  table: string;
  titleField: string;
  descriptionField: string;
  owner: string;
  context: string;
  fields: Field[];
  select: string;
  categoryField?: string;
  categoryTable?: string;
  sector?: string;
  publicFilter?: Record<string, string>;
  defaults?: Record<string, unknown>;
  statuses?: Option[];
  authOnly?: boolean;
  photo?: { table: string; fk: string; bucket: string };
  comment?: { table: string; fk: string; content: string; owner: string };
};
const opts = (values: string[][]): Option[] =>
  values.map(([value, label]) => ({ value, label }));
const title: Field = {
  name: "title",
  label: "Titre",
  required: true,
  max: 160,
};
const description: Field = {
  name: "description",
  label: "Description",
  type: "textarea",
  required: true,
  min: 20,
  max: 8000,
};
const location = (name = "location"): Field => ({
  name,
  label: "Lieu ou quartier",
  required: true,
  max: 180,
});
const category = (name: string, lookup: string): Field => ({
  name,
  label: "Catégorie",
  type: "select",
  lookup,
  required: true,
});
export const JOB_CATEGORIES = opts([
  ["restauration", "Restauration"],
  ["hotellerie", "Hôtellerie"],
  ["commerce", "Commerce"],
  ["artisanat", "Artisanat"],
  ["batiment", "Bâtiment"],
  ["services_personne", "Services à la personne"],
  ["administratif", "Administratif"],
  ["logistique", "Logistique"],
  ["nettoyage", "Nettoyage"],
  ["transport", "Transport"],
  ["sante", "Santé"],
  ["animation", "Animation"],
  ["petite_enfance", "Petite enfance"],
  ["association", "Associations"],
  ["evenementiel", "Événementiel"],
  ["agriculture", "Agriculture"],
  ["autre", "Autre"],
]);
export const SECTORS = opts([
  ["les-collines", "Les Collines"],
  ["figabruna", "Figabruna"],
  ["village", "Village de Biguglia"],
  ["casatorra", "Casatorra"],
  ["ortale", "Ortale"],
  ["la-plaine", "La Plaine"],
  ["la-marana", "La Marana"],
]);
export const STATUS_LABELS: Record<string, string> = {
  submitted: "Publiée",
  viewed: "Consultée",
  replied: "Réponse reçue",
  scheduled: "Programmée",
  completed: "Terminée",
  cancelled: "Annulée",
  active: "Active",
  sold: "Vendue",
  archived: "Archivée",
  available: "Disponible",
  disponible: "Disponible",
  reserve: "Réservé",
  prete: "Prêté",
  indisponible: "Indisponible",
  archive: "Archivé",
  a_venir: "À venir",
  complet: "Complet",
  reporte: "Reporté",
  annule: "Annulé",
  passe: "Passé",
  published: "Publiée",
  draft: "Brouillon",
  filled: "Pourvu",
  expired: "Expirée",
  actif: "Actif",
  vendu: "Vendu",
  echange: "Échangé",
  donne: "Donné",
  trouve: "Retrouvé",
  retire: "Retiré",
  open: "Ouvert",
  closed: "Clos",
  resolved: "Résolu",
  perdu: "Perdu",
  trouve_actif: "Trouvé",
  normal: "Normal",
  urgent: "Urgent",
  tres_urgent: "Très urgent",
  pending: "En attente",
  approved: "Acceptée",
  rejected: "Refusée",
  borrowed: "En cours",
  returned: "Rendu",
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
  terminee: "Terminée",
  reservee: "Réservée",
  en_cours: "En cours",
  retourne: "Rendu",
  inscrit: "Inscrit",
  confirme: "Confirmé",
  liste_attente: "Liste d’attente",
  publie: "Publié",
  en_attente_validation: "En cours de validation",
  masque: "Masqué",
};
export const label = (value: unknown) =>
  STATUS_LABELS[String(value)] ?? String(value ?? "").replaceAll("_", " ");

export const MODULES: Module[] = [
  {
    slug: "artisans",
    title: "Artisans",
    singular: "un profil artisan",
    description: "Les savoir-faire d’ici, pour vos projets du quotidien.",
    group: "Services",
    icon: Wrench,
    color: "clay",
    table: "artisan_profiles",
    titleField: "business_name",
    descriptionField: "description",
    owner: "user_id",
    context: "artisan",
    sector: "location",
    categoryField: "trade_category_id",
    categoryTable: "trade_categories",
    select:
      "id,user_id,business_name,description,trade_category_id,service_area,years_experience,artisan_type,is_verified,trade_name,location,avatar_url,created_at",
    publicFilter: { is_verified: "eq.true" },
    fields: [
      {
        name: "business_name",
        label: "Nom de l’activité",
        required: true,
        max: 160,
      },
      category("trade_category_id", "trade_categories"),
      description,
      {
        name: "artisan_type",
        label: "Vous êtes",
        type: "select",
        required: true,
        options: opts([
          ["professionnel", "Professionnel"],
          ["particulier", "Particulier"],
        ]),
      },
      { name: "service_area", label: "Zone d’intervention", required: true },
      {
        name: "years_experience",
        label: "Années d’expérience",
        type: "number",
        min: 0,
        max: 80,
      },
      {
        name: "siret",
        label: "SIRET professionnel",
        min: 14,
        max: 14,
        hint: "Renseigné uniquement si vous êtes professionnel.",
      },
    ],
    photo: {
      table: "artisan_photos",
      fk: "artisan_id",
      bucket: "artisan-photos",
    },
  },
  {
    slug: "demandes",
    title: "Tableau des demandes",
    singular: "une demande",
    description: "Un besoin ? Trouvez la bonne personne près de chez vous.",
    group: "Services",
    icon: ClipboardList,
    color: "clay",
    table: "service_requests",
    titleField: "title",
    descriptionField: "description",
    owner: "resident_id",
    context: "service_request",
    sector: "sector_id",
    authOnly: true,
    categoryField: "category_id",
    categoryTable: "trade_categories",
    select:
      "id,resident_id,artisan_id,category_id,title,description,urgency,preferred_date,preferred_time,address,status,sector_id,created_at",
    fields: [
      title,
      category("category_id", "trade_categories"),
      description,
      {
        name: "urgency",
        label: "Urgence",
        type: "select",
        required: true,
        options: opts([
          ["normal", "Dès que possible"],
          ["urgent", "Urgent"],
          ["tres_urgent", "Très urgent"],
        ]),
      },
      { name: "preferred_date", label: "Date souhaitée", type: "date" },
      { name: "preferred_time", label: "Heure souhaitée", type: "time" },
      location("address"),
    ],
    defaults: { status: "submitted" },
    statuses: opts([
      ["submitted", "Publiée"],
      ["replied", "Échange en cours"],
      ["scheduled", "Programmée"],
      ["completed", "Terminée"],
      ["cancelled", "Annulée"],
    ]),
    photo: {
      table: "service_request_photos",
      fk: "request_id",
      bucket: "service-requests",
    },
    comment: {
      table: "request_comments",
      fk: "request_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "annonces",
    title: "Petites annonces",
    singular: "une annonce",
    description:
      "Une seconde vie pour les objets, un lien de plus entre voisins.",
    group: "Vie pratique",
    icon: ShoppingBag,
    color: "sage",
    table: "listings",
    titleField: "title",
    descriptionField: "description",
    owner: "user_id",
    context: "listing",
    sector: "sector_id",
    categoryField: "category_id",
    categoryTable: "listing_categories",
    select:
      "id,user_id,title,description,listing_type,price,condition,location,status,category_id,sector_id,cover_url,created_at",
    publicFilter: { status: "eq.active" },
    fields: [
      title,
      category("category_id", "listing_categories"),
      {
        name: "listing_type",
        label: "Type d’annonce",
        type: "select",
        required: true,
        options: opts([
          ["sale", "Je vends"],
          ["free", "Je donne"],
          ["wanted", "Je recherche"],
          ["service", "Je propose un service"],
        ]),
      },
      description,
      {
        name: "price",
        label: "Prix (€)",
        type: "number",
        min: 0,
        max: 1000000,
      },
      {
        name: "condition",
        label: "État",
        type: "select",
        options: opts([
          ["neuf", "Neuf"],
          ["tres_bon", "Très bon état"],
          ["bon", "Bon état"],
          ["usage", "État d’usage"],
        ]),
      },
      location(),
    ],
    defaults: { status: "active" },
    statuses: opts([
      ["active", "En ligne"],
      ["sold", "Vendue / donnée"],
      ["archived", "Archivée"],
    ]),
    photo: {
      table: "listing_photos",
      fk: "listing_id",
      bucket: "listing-photos",
    },
  },
  {
    slug: "materiel",
    title: "Prêt de matériel",
    singular: "un matériel",
    description: "Emprunter plutôt qu’acheter. Partageons ce qui peut servir.",
    group: "Vie pratique",
    icon: Drill,
    color: "sage",
    table: "equipment_items",
    titleField: "title",
    descriptionField: "description",
    owner: "owner_id",
    context: "equipment",
    sector: "sector_id",
    categoryField: "category_id",
    categoryTable: "equipment_categories",
    select:
      "id,owner_id,category_id,title,description,condition,deposit_amount,is_free,daily_rate,pickup_location,rules,is_available,status,location_area,sector_id,created_at",
    publicFilter: { status: "neq.archive" },
    fields: [
      title,
      category("category_id", "equipment_categories"),
      description,
      {
        name: "condition",
        label: "État",
        type: "select",
        options: opts([
          ["excellent", "Excellent"],
          ["bon", "Bon"],
          ["usage", "Usagé"],
        ]),
        required: true,
      },
      { name: "is_free", label: "Prêt gratuit", type: "checkbox" },
      {
        name: "daily_rate",
        label: "Tarif journalier (€)",
        type: "number",
        min: 0,
      },
      { name: "deposit_amount", label: "Caution (€)", type: "number", min: 0 },
      location("pickup_location"),
      { name: "rules", label: "Conditions du prêt", type: "textarea" },
    ],
    defaults: { status: "disponible", is_available: true, is_free: true },
    statuses: opts([
      ["disponible", "Disponible"],
      ["reserve", "Réservé"],
      ["prete", "Prêté"],
      ["indisponible", "Indisponible"],
      ["archive", "Archivé"],
    ]),
    photo: {
      table: "equipment_photos",
      fk: "item_id",
      bucket: "equipment-photos",
    },
  },
  {
    slug: "collectionneurs",
    title: "Collectionneurs",
    singular: "un objet de collection",
    description: "Trouvez la pièce qui manque à votre histoire.",
    group: "Vie pratique",
    icon: Gem,
    color: "sand",
    table: "collection_items",
    titleField: "title",
    descriptionField: "description",
    owner: "author_id",
    context: "collection_item",
    sector: "sector_id",
    categoryField: "category_id",
    categoryTable: "collection_categories",
    select:
      "id,author_id,title,description,category_id,mode,status,price,condition,rarity_level,year_period,brand,city,sector_id,created_at",
    publicFilter: { status: "eq.active" },
    fields: [
      title,
      category("category_id", "collection_categories"),
      description,
      {
        name: "mode",
        label: "Votre annonce",
        type: "select",
        required: true,
        options: opts([
          ["vente", "Vente"],
          ["echange", "Échange"],
          ["don", "Don"],
          ["recherche", "Recherche"],
        ]),
      },
      {
        name: "condition",
        label: "État",
        type: "select",
        required: true,
        options: opts([
          ["neuf", "Neuf"],
          ["excellent", "Excellent"],
          ["bon", "Bon"],
          ["passable", "Passable"],
        ]),
      },
      {
        name: "rarity_level",
        label: "Rareté",
        type: "select",
        options: opts([
          ["commun", "Commun"],
          ["peu_commun", "Peu commun"],
          ["rare", "Rare"],
          ["tres_rare", "Très rare"],
          ["unique", "Unique"],
        ]),
      },
      { name: "price", label: "Prix (€)", type: "number", min: 0 },
      { name: "year_period", label: "Année / période" },
      { name: "brand", label: "Marque / éditeur" },
      location("city"),
    ],
    defaults: { status: "active", mode: "vente" },
    statuses: opts([
      ["active", "En ligne"],
      ["reserved", "Réservé"],
      ["sold", "Vendu / donné"],
      ["exchanged", "Échangé"],
      ["archived", "Archivé"],
    ]),
    photo: {
      table: "collection_item_photos",
      fk: "item_id",
      bucket: "collection-photos",
    },
    comment: {
      table: "collection_item_comments",
      fk: "item_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "perdu-trouve",
    title: "Perdu / Trouvé",
    singular: "un signalement",
    description: "Un objet égaré ? À plusieurs, on le retrouve plus vite.",
    group: "Vie pratique",
    icon: Search,
    color: "sand",
    table: "lost_found_items",
    titleField: "title",
    descriptionField: "description",
    owner: "author_id",
    context: "lost_found",
    sector: "sector_id",
    select:
      "id,author_id,type,status,title,category,description,brand,color,lost_date,lost_time,location_area,location_detail,reward,sector_id,created_at",
    fields: [
      title,
      {
        name: "type",
        label: "Type de signalement",
        type: "select",
        required: true,
        options: opts([
          ["perdu", "J’ai perdu"],
          ["trouve", "J’ai trouvé"],
        ]),
      },
      description,
      {
        name: "lost_date",
        label: "Date de perte / découverte",
        type: "date",
        required: true,
      },
      location("location_area"),
      { name: "brand", label: "Marque" },
      { name: "color", label: "Couleur" },
      { name: "reward", label: "Récompense éventuelle" },
    ],
    photo: { table: "lf_photos", fk: "item_id", bucket: "lost-found-photos" },
    comment: {
      table: "lf_comments",
      fk: "item_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "emploi/offres",
    title: "Offres d’emploi",
    singular: "une offre d’emploi",
    description: "Des opportunités professionnelles, tout près de chez vous.",
    group: "Vie pratique",
    icon: BriefcaseBusiness,
    color: "sky",
    table: "job_offers",
    titleField: "title",
    descriptionField: "full_description",
    owner: "user_id",
    context: "general",
    sector: "sector_id",
    select:
      "id,user_id,slug,title,job_category,contract_type,employer_name,short_description,full_description,location_label,location_city,status,salary_range_min,salary_range_max,weekly_hours,sector_id,created_at",
    publicFilter: { status: "eq.published" },
    fields: [
      title,
      {
        name: "job_category",
        label: "Secteur d’activité",
        required: true,
        type: "select",
        options: JOB_CATEGORIES,
      },
      {
        name: "contract_type",
        label: "Contrat",
        required: true,
        type: "select",
        options: opts([
          ["cdi", "CDI"],
          ["cdd", "CDD"],
          ["saisonnier", "Saisonnier"],
          ["interim", "Intérim"],
          ["alternance", "Alternance"],
          ["stage", "Stage"],
          ["extra", "Extra"],
          ["freelance", "Indépendant"],
        ]),
      },
      { name: "employer_name", label: "Employeur", required: true },
      {
        name: "short_description",
        label: "Présentation courte",
        required: true,
        max: 300,
      },
      {
        name: "full_description",
        label: "Missions et profil recherché",
        type: "textarea",
        required: true,
        min: 30,
      },
      location("location_label"),
      {
        name: "salary_range_min",
        label: "Salaire minimum (€)",
        type: "number",
        min: 0,
      },
      {
        name: "salary_range_max",
        label: "Salaire maximum (€)",
        type: "number",
        min: 0,
      },
      {
        name: "weekly_hours",
        label: "Heures par semaine",
        type: "number",
        min: 1,
        max: 60,
      },
    ],
    defaults: { status: "published" },
    statuses: opts([
      ["published", "En ligne"],
      ["filled", "Pourvue"],
      ["expired", "Expirée"],
      ["archived", "Archivée"],
    ]),
  },
  {
    slug: "emploi/demandes",
    title: "Recherche d’emploi",
    singular: "une recherche d’emploi",
    description: "Faites connaître vos compétences aux employeurs locaux.",
    group: "Vie pratique",
    icon: BriefcaseBusiness,
    color: "sky",
    table: "job_demands",
    titleField: "title",
    descriptionField: "full_description",
    owner: "user_id",
    context: "general",
    sector: "sector_id",
    select:
      "id,user_id,slug,title,job_category,short_description,full_description,location_label,experience_summary,availability_type,status,sector_id,created_at",
    publicFilter: { status: "eq.published" },
    fields: [
      title,
      {
        name: "job_category",
        label: "Métier / domaine",
        required: true,
        type: "select",
        options: JOB_CATEGORIES,
      },
      {
        name: "short_description",
        label: "En quelques mots",
        required: true,
        max: 300,
      },
      {
        name: "full_description",
        label: "Votre recherche",
        type: "textarea",
        required: true,
        min: 30,
      },
      {
        name: "experience_summary",
        label: "Votre expérience",
        type: "textarea",
      },
      location("location_label"),
    ],
    defaults: { status: "published" },
    statuses: opts([
      ["published", "En ligne"],
      ["filled", "Emploi trouvé"],
      ["archived", "Archivée"],
    ]),
  },
  {
    slug: "evenements",
    title: "Événements",
    singular: "un événement",
    description: "Les rendez-vous qui nous rassemblent.",
    group: "Vie locale",
    icon: CalendarDays,
    color: "clay",
    table: "events",
    titleField: "title",
    descriptionField: "description",
    owner: "author_id",
    context: "event",
    sector: "sector_id",
    select:
      "id,author_id,title,description,event_date,event_time,location,category,organizer_name,max_participants,is_free,price,status,capacity,registration_open,cover_photo_url,cover_url,sector_id,created_at",
    publicFilter: { status: "neq.archive" },
    fields: [
      title,
      description,
      { name: "event_date", label: "Date", type: "date", required: true },
      { name: "event_time", label: "Heure", type: "time", required: true },
      location(),
      {
        name: "category",
        label: "Catégorie",
        type: "select",
        required: true,
        options: opts([
          ["culture", "Culture"],
          ["sport", "Sport"],
          ["concert", "Concert"],
          ["fete", "Fête"],
          ["marche", "Marché"],
          ["autres", "Autre"],
        ]),
      },
      { name: "organizer_name", label: "Organisateur", required: true },
      {
        name: "max_participants",
        label: "Nombre de places (vide = illimité)",
        type: "number",
        min: 1,
      },
      { name: "is_free", label: "Entrée gratuite", type: "checkbox" },
      { name: "price", label: "Prix (€)", type: "number", min: 0 },
    ],
    defaults: { status: "a_venir", is_free: true, registration_open: true },
    statuses: opts([
      ["a_venir", "À venir"],
      ["complet", "Complet"],
      ["reporte", "Reporté"],
      ["annule", "Annulé"],
      ["archive", "Archivé"],
    ]),
    photo: { table: "event_photos", fk: "event_id", bucket: "event-photos" },
    comment: {
      table: "event_comments",
      fk: "event_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "promenades",
    title: "Promenades",
    singular: "une promenade",
    description: "Redécouvrez les chemins autour de chez vous.",
    group: "Vie locale",
    icon: Footprints,
    color: "sage",
    table: "promenades",
    titleField: "title",
    descriptionField: "description",
    owner: "author_id",
    context: "general",
    sector: "sector_id",
    select:
      "id,author_id,title,description,distance_km,duration_min,difficulty,type,start_point,status,dogs_allowed,stroller_friendly,parking_available,water_access,route_loop,practical_tips,safety_notes,sector_id,created_at",
    publicFilter: { status: "eq.active" },
    fields: [
      title,
      description,
      location("start_point"),
      {
        name: "distance_km",
        label: "Distance (km)",
        type: "number",
        min: 0,
        max: 200,
      },
      {
        name: "duration_min",
        label: "Durée (minutes)",
        type: "number",
        min: 1,
        max: 1440,
      },
      {
        name: "difficulty",
        label: "Difficulté",
        type: "select",
        required: true,
        options: opts([
          ["facile", "Facile"],
          ["moyen", "Moyen"],
          ["difficile", "Difficile"],
        ]),
      },
      { name: "dogs_allowed", label: "Chiens autorisés", type: "checkbox" },
      {
        name: "stroller_friendly",
        label: "Accessible en poussette",
        type: "checkbox",
      },
      {
        name: "parking_available",
        label: "Parking à proximité",
        type: "checkbox",
      },
      { name: "route_loop", label: "Circuit en boucle", type: "checkbox" },
      { name: "practical_tips", label: "Conseils pratiques", type: "textarea" },
      { name: "safety_notes", label: "Précautions", type: "textarea" },
    ],
    defaults: { status: "active" },
    statuses: opts([
      ["active", "Publiée"],
      ["archived", "Archivée"],
    ]),
    photo: {
      table: "promenade_photos",
      fk: "promenade_id",
      bucket: "promenade-photos",
    },
  },
  {
    slug: "sorties",
    title: "Sorties en groupe",
    singular: "une sortie",
    description: "Une balade est encore plus belle quand on la partage.",
    group: "Vie locale",
    icon: Map,
    color: "sage",
    table: "group_outings",
    titleField: "title",
    descriptionField: "description",
    owner: "organizer_id",
    context: "outing",
    sector: "sector_id",
    select:
      "id,organizer_id,promenade_id,title,description,outing_date,outing_time,max_participants,meeting_point,status,difficulty,kids_friendly,dogs_allowed,is_registration_open,cover_photo_url,sector_id,created_at",
    publicFilter: { status: "neq.archivee" },
    fields: [
      title,
      description,
      {
        name: "outing_date",
        label: "Date de la sortie",
        type: "date",
        required: true,
      },
      {
        name: "outing_time",
        label: "Heure de rendez-vous",
        type: "time",
        required: true,
      },
      location("meeting_point"),
      {
        name: "max_participants",
        label: "Places",
        type: "number",
        required: true,
        min: 2,
        max: 500,
      },
      { name: "kids_friendly", label: "Adaptée aux enfants", type: "checkbox" },
      { name: "dogs_allowed", label: "Chiens acceptés", type: "checkbox" },
    ],
    defaults: { status: "ouverte", is_registration_open: true },
    statuses: opts([
      ["ouverte", "Inscriptions ouvertes"],
      ["complete", "Complète"],
      ["annulee", "Annulée"],
      ["terminee", "Terminée"],
    ]),
    photo: { table: "outing_photos", fk: "outing_id", bucket: "outing-photos" },
    comment: {
      table: "outing_comments",
      fk: "outing_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "associations",
    title: "Associations",
    singular: "une association",
    description: "Des passions, des engagements, une vie locale qui bouge.",
    group: "Vie locale",
    icon: Users,
    color: "sky",
    table: "associations",
    titleField: "name",
    descriptionField: "description_full",
    owner: "author_id",
    context: "association",
    sector: "sector_id",
    select:
      "id,author_id,name,slogan,category,description_short,description_full,location,address,schedule,price_type,price_detail,status,is_accepting_members,is_accepting_volunteers,contact_website,sector_id,created_at",
    publicFilter: { status: "eq.active" },
    fields: [
      { name: "name", label: "Nom de l’association", required: true, max: 160 },
      { name: "slogan", label: "Slogan / devise", max: 200 },
      {
        name: "category",
        label: "Domaine",
        type: "select",
        options: opts([
          ["sport", "Sport"],
          ["culture", "Culture"],
          ["solidarite", "Solidarité"],
          ["nature", "Nature"],
          ["autre", "Autre"],
        ]),
        required: true,
      },
      {
        name: "description_short",
        label: "Présentation courte",
        required: true,
        max: 300,
      },
      {
        name: "description_full",
        label: "Présentation complète",
        type: "textarea",
        required: true,
        min: 30,
      },
      location(),
      { name: "schedule", label: "Horaires et permanences" },
      { name: "contact_website", label: "Site Internet", type: "url" },
      {
        name: "is_accepting_members",
        label: "Accepte de nouveaux adhérents",
        type: "checkbox",
      },
      {
        name: "is_accepting_volunteers",
        label: "Recherche des bénévoles",
        type: "checkbox",
      },
    ],
    defaults: { status: "active" },
    statuses: opts([
      ["active", "Active"],
      ["inactive", "Inactive"],
      ["closed", "Fermée"],
    ]),
    photo: {
      table: "asso_photos",
      fk: "asso_id",
      bucket: "association-photos",
    },
    comment: {
      table: "asso_comments",
      fk: "asso_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "coups-de-main",
    title: "Coups de main",
    singular: "un coup de main",
    description: "Les petits gestes qui font les grands liens.",
    group: "Vie locale",
    icon: HandHeart,
    color: "clay",
    table: "help_requests",
    titleField: "title",
    descriptionField: "description",
    owner: "author_id",
    context: "help_request",
    sector: "sector_id",
    select:
      "id,author_id,help_type,status,title,category,description,urgency,help_date,help_time,location_area,duration,persons_needed,compensation,sector_id,created_at",
    fields: [
      title,
      {
        name: "help_type",
        label: "Votre publication",
        type: "select",
        required: true,
        options: opts([
          ["demande", "Je demande de l’aide"],
          ["offre", "Je propose de l’aide"],
        ]),
      },
      description,
      location("location_area"),
      { name: "help_date", label: "Date souhaitée", type: "date" },
      { name: "help_time", label: "Heure", type: "time" },
      { name: "duration", label: "Durée estimée" },
      {
        name: "persons_needed",
        label: "Nombre de personnes",
        type: "number",
        min: 1,
        max: 100,
      },
    ],
    photo: { table: "help_photos", fk: "help_id", bucket: "help-photos" },
    comment: {
      table: "help_comments",
      fk: "help_id",
      content: "content",
      owner: "author_id",
    },
  },
  {
    slug: "forum",
    title: "Forum des habitants",
    singular: "une discussion",
    description: "Des questions, des idées et des conversations de quartier.",
    group: "Communauté",
    icon: MessagesSquare,
    color: "sky",
    table: "forum_topics",
    titleField: "title",
    descriptionField: "content",
    owner: "author_id",
    context: "general",
    categoryField: "category_id",
    categoryTable: "forum_categories",
    select:
      "id,author_id,title,content,category_id,status,reply_count,reaction_count,is_pinned,created_at",
    publicFilter: { status: "in.(ouvert,verrouille)" },
    fields: [
      title,
      category("category_id", "forum_categories"),
      {
        name: "content",
        label: "Votre message",
        type: "textarea",
        required: true,
        min: 20,
        max: 8000,
      },
    ],
    comment: {
      table: "forum_replies",
      fk: "topic_id",
      content: "content",
      owner: "author_id",
    },
  },
];
export const moduleBySlug = (slug: string) =>
  MODULES.find((m) => m.slug === slug);
export const moduleTitle = (m: Module, row: Row) =>
  str(row, m.titleField, "Sans titre");
export function locationText(row: Row) {
  return (
    str(row, "location_area") ||
    str(row, "location_label") ||
    str(row, "location") ||
    str(row, "city") ||
    str(row, "meeting_point") ||
    str(row, "start_point") ||
    "Biguglia"
  );
}
export function recordImage(row: Row) {
  return (
    str(row, "cover_url") ||
    str(row, "cover_photo_url") ||
    str(row, "avatar_url")
  );
}
export function buildPayload(
  m: Module,
  form: Record<string, unknown>,
  userId: string,
  editing: boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = editing
    ? {}
    : { ...m.defaults, [m.owner]: userId };
  for (const field of m.fields) {
    const value = form[field.name];
    if (field.type === "checkbox") result[field.name] = !!value;
    else if (field.type === "number") {
      const n = value === "" || value == null ? null : Number(value);
      if (field.required && n == null)
        throw new Error(`Le champ « ${field.label} » est obligatoire.`);
      if (
        n != null &&
        (!Number.isFinite(n) ||
          (field.min != null && n < field.min) ||
          (field.max != null && n > field.max))
      )
        throw new Error(`La valeur de « ${field.label} » n’est pas valide.`);
      result[field.name] = n;
    } else {
      const text = String(value ?? "").trim();
      if (field.required && !text)
        throw new Error(`Le champ « ${field.label} » est obligatoire.`);
      if (text && field.min && text.length < field.min)
        throw new Error(
          `« ${field.label} » doit comporter au moins ${field.min} caractères.`,
        );
      if (field.max && text.length > field.max)
        throw new Error(`« ${field.label} » est trop long.`);
      if (field.options && text && !field.options.some((o) => o.value === text))
        throw new Error(`La sélection de « ${field.label} » n’est pas valide.`);
      result[field.name] = text || null;
    }
  }
  if (m.sector === "sector_id") {
    if (form.sector_id && !SECTORS.some((s) => s.value === form.sector_id))
      throw new Error("Quartier invalide.");
    result.sector_id = form.sector_id || null;
  }
  if (!editing && m.table.startsWith("job_"))
    result.slug = `${String(form.title)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}-${crypto.randomUUID().slice(0, 8)}`;
  if (m.table === "listings" && result.listing_type === "free")
    result.price = 0;
  if (m.table === "equipment_items")
    result.is_available = editing ? undefined : true;
  if (m.table === "events") {
    result.capacity = result.max_participants;
    result.is_unlimited = !result.max_participants;
    if (result.is_free) result.price = 0;
  }
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== undefined),
  );
}

export const contentType = (m: Module) =>
  m.context !== "general"
    ? m.context
    : ({
        job_offers: "job_offer",
        job_demands: "job_demand",
        forum_topics: "forum_topic",
        promenades: "promenade",
      }[m.table] ?? m.table);
