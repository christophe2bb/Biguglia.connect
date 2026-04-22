import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen, FileText, Eye, Flag, Shield, CheckCircle,
  AlertTriangle, Clock, ArrowRight, MessageSquare,
  Star, Users, Lock, ThumbsUp, XCircle, Info,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Règles de la communauté — Biguglia Connect',
  description:
    'Les règles claires de Biguglia Connect : publier une annonce, comment fonctionne la modération, comment signaler un abus, et comment fonctionne le système de confiance.',
  alternates: { canonical: `${SITE_URL}/regles` },
  openGraph: {
    title:       'Règles de la communauté — Biguglia Connect',
    description: 'Règles de publication, modération, signalements et système de confiance de Biguglia Connect.',
    url:         `${SITE_URL}/regles`,
    type:        'website',
  },
};

// ─── Sections data ────────────────────────────────────────────────────────────

const publicationRules = [
  {
    allowed: true,
    title: 'Annonces locales',
    desc: 'Offres/demandes d\'emploi, petites annonces de vente ou échange, prêt de matériel entre habitants de Biguglia et ses environs.',
  },
  {
    allowed: true,
    title: 'Contenu communautaire',
    desc: 'Événements locaux, actualités de la commune, sorties en groupe, questions d\'entraide et forum ouvert.',
  },
  {
    allowed: true,
    title: 'Services artisanaux',
    desc: 'Présentation honnête de vos compétences, tarifs indicatifs, zone d\'intervention. Les artisans vérifiés peuvent afficher le badge correspondant.',
  },
  {
    allowed: false,
    title: 'Spam & démarchage',
    desc: 'Publicités commerciales non locales, messages en masse, contenu dupliqué, liens d\'affiliation ou MLM.',
  },
  {
    allowed: false,
    title: 'Contenu trompeur',
    desc: 'Fausses informations, usurpation d\'identité, prix ou disponibilités inventées, photos non représentatives.',
  },
  {
    allowed: false,
    title: 'Contenu illicite ou offensant',
    desc: 'Propos haineux, discriminatoires, contenu à caractère sexuel, appels à la violence ou activités illégales.',
  },
];

const moderationSteps = [
  {
    icon: '📝',
    title: 'Publication',
    desc: 'Votre annonce ou message est publié immédiatement. Un algorithme vérifie automatiquement les mots-clés sensibles et le format.',
    color: 'bg-sky-50 border-sky-200 text-sky-800',
    dotColor: 'bg-sky-500',
  },
  {
    icon: '🤖',
    title: 'Analyse automatique',
    desc: 'Un filtre anti-spam détecte les contenus problématiques évidents (liens suspects, répétitions, mots interdits) et les met en attente.',
    color: 'bg-violet-50 border-violet-200 text-violet-800',
    dotColor: 'bg-violet-500',
  },
  {
    icon: '👁️',
    title: 'Revue humaine',
    desc: 'Un modérateur examine les contenus signalés ou mis en attente. Décision sous 24–48h en semaine.',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    icon: '⚖️',
    title: 'Décision',
    desc: 'Le contenu est validé, modifié ou supprimé. Vous êtes notifié du motif si votre publication est refusée.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  {
    icon: '🔄',
    title: 'Recours',
    desc: 'Vous pouvez contester une décision via la messagerie interne. L\'administrateur réévalue sous 48h.',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    dotColor: 'bg-gray-400',
  },
];

const reportTypes = [
  {
    where: 'Annonce ou offre d\'emploi',
    how: 'Bouton 🚩 en haut de l\'annonce',
    delay: '24h ouvrées',
    icon: '📋',
  },
  {
    where: 'Profil artisan ou utilisateur',
    how: 'Bouton "Signaler ce profil" sur la fiche',
    delay: '12–24h',
    icon: '👤',
  },
  {
    where: 'Message dans une conversation',
    how: 'Menu "…" sur le message concerné',
    delay: '24h ouvrées',
    icon: '💬',
  },
  {
    where: 'Post ou commentaire du forum',
    how: 'Icône drapeau sous le post',
    delay: '12–48h',
    icon: '🗨️',
  },
  {
    where: 'Avis sur un artisan',
    how: 'Bouton "Signaler cet avis"',
    delay: '24–48h',
    icon: '⭐',
  },
];

const trustLevels = [
  {
    badge: '🆕 Nouveau membre',
    condition: 'Inscription récente, profil non complété',
    perms: ['Publication d\'annonces', 'Participation au forum', 'Messagerie'],
    limits: ['Pas encore de note ni d\'avis', 'Limité à 3 annonces simultanées'],
    color: 'border-gray-200 bg-gray-50',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
  {
    badge: '✅ Membre actif',
    condition: 'Profil complété + au moins un échange ou avis reçu',
    perms: ['Toutes les fonctionnalités', 'Avis et notes', 'Emprunt de matériel', 'Jusqu\'à 10 annonces'],
    limits: [],
    color: 'border-sky-200 bg-sky-50',
    badgeColor: 'bg-sky-100 text-sky-700',
  },
  {
    badge: '🔵 Artisan vérifié',
    condition: 'Dossier validé manuellement par l\'admin (SIRET + assurance)',
    perms: ['Badge visible sur le profil', 'Priorité dans la recherche', 'Statistiques de profil', 'Réponse aux avis'],
    limits: ['Vérification renouvelable annuellement'],
    color: 'border-brand-200 bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    badge: '🏅 Artisan de confiance',
    condition: 'Note ≥ 4.5 ★ + ≥ 5 avis vérifiés + compte actif > 6 mois',
    perms: ['Badge gold visible', 'Mise en avant sur la page d\'accueil', 'Accès aux statistiques avancées'],
    limits: [],
    color: 'border-amber-300 bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
];

const sanctionLevels = [
  { level: 'Avertissement', trigger: 'Première infraction mineure', action: 'Notification privée, contenu retiré', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { level: 'Suspension temporaire', trigger: 'Récidive ou infraction grave', action: '7 à 30 jours selon la gravité', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { level: 'Suspension définitive', trigger: 'Infraction très grave ou récidive après suspension', action: 'Compte désactivé, données conservées 3 ans RGPD', color: 'text-rose-700 bg-rose-50 border-rose-200' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  return (
    <div className="overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-20 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-4 bg-brand-500/15 rounded-3xl border border-brand-500/25 mb-6">
            <BookOpen className="w-9 h-9 text-brand-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Règles de la communauté
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Pour que Biguglia Connect reste un espace de confiance, quelques règles simples s&apos;appliquent à tous.
            Lisez-les une fois — elles tiennent en moins de 5 minutes.
          </p>

          {/* Quick-nav pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              { href: '#publication', label: '📋 Publication' },
              { href: '#moderation', label: '👁️ Modération' },
              { href: '#signalements', label: '🚩 Signalements' },
              { href: '#confiance', label: '🏅 Confiance' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/12 hover:border-white/25 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">

        {/* ── 1. RÈGLES DE PUBLICATION ─────────────────────────────────── */}
        <section id="publication" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-sky-100 rounded-2xl">
              <FileText className="w-6 h-6 text-sky-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Règles de publication</h2>
              <p className="text-gray-500 text-sm mt-0.5">Ce qui est accepté et ce qui ne l&apos;est pas</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {publicationRules.map(({ allowed, title, desc }) => (
              <div
                key={title}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  allowed
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-rose-50 border-rose-100'
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {allowed
                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                    : <XCircle    className="w-5 h-5 text-rose-500" />
                  }
                </span>
                <div>
                  <h3 className={`font-bold text-sm mb-1 ${allowed ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${allowed ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Règle d'or */}
          <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm leading-relaxed">
              <strong>Règle d&apos;or :</strong> si vous hésitez à publier quelque chose, demandez-vous simplement —
              &ldquo;est-ce que je serais à l&apos;aise si mes voisins le voyaient ?&rdquo;
              Si la réponse est non, abstenez-vous ou reformulez.
            </p>
          </div>
        </section>

        {/* ── 2. MODÉRATION ────────────────────────────────────────────── */}
        <section id="moderation" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-violet-100 rounded-2xl">
              <Eye className="w-6 h-6 text-violet-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Fonctionnement de la modération</h2>
              <p className="text-gray-500 text-sm mt-0.5">Transparence totale sur ce qui se passe en coulisses</p>
            </div>
          </div>

          {/* Principes */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                icon: ThumbsUp,
                title: 'Humaine d\'abord',
                desc: 'Toute décision finale est prise par une personne réelle, pas un algorithme. L\'automatisation ne fait que trier.',
                color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
              },
              {
                icon: Clock,
                title: 'Délais affichés',
                desc: 'Délai cible : 24h en semaine, 48h le week-end. En cas de débordement, nous le communiquons.',
                color: 'bg-sky-50 border-sky-100 text-sky-700',
              },
              {
                icon: MessageSquare,
                title: 'Motif systématique',
                desc: 'Tout refus ou suppression est accompagné d\'un motif précis. Vous n\'êtes jamais laissé sans explication.',
                color: 'bg-amber-50 border-amber-100 text-amber-700',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className={`rounded-2xl border p-4 ${color}`}>
                <Icon className="w-5 h-5 mb-2" />
                <h3 className="font-bold text-sm mb-1">{title}</h3>
                <p className="text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Processus étape par étape */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <span className="text-violet-600">⟳</span> Processus de modération étape par étape
              </h3>
            </div>
            <div className="p-6 space-y-0">
              {moderationSteps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 ${step.dotColor} rounded-full flex items-center justify-center text-white text-sm font-black`}>
                      {i + 1}
                    </div>
                    {i < moderationSteps.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-2 mb-2 min-h-[1.5rem]" />
                    )}
                  </div>
                  <div className={`${i < moderationSteps.length - 1 ? 'pb-5' : ''}`}>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">
                      <span className="mr-1.5">{step.icon}</span>{step.title}
                    </h4>
                    <p className="text-gray-600 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sanctions */}
          <div className="mt-6 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Échelle des sanctions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {sanctionLevels.map(({ level, trigger, action, color }) => (
                <div key={level} className={`flex items-start gap-3 rounded-xl border p-3.5 ${color}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{level}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">
                      <strong>Déclencheur :</strong> {trigger} &nbsp;·&nbsp; <strong>Conséquence :</strong> {action}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2 italic">
                Les décisions peuvent toujours être contestées via la messagerie interne dans les 7 jours.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. SIGNALEMENTS ──────────────────────────────────────────── */}
        <section id="signalements" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-rose-100 rounded-2xl">
              <Flag className="w-6 h-6 text-rose-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Fonctionnement des signalements</h2>
              <p className="text-gray-500 text-sm mt-0.5">Comment signaler et ce qu&apos;il se passe ensuite</p>
            </div>
          </div>

          {/* Table where/how/delay */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-bold text-gray-700 text-xs uppercase tracking-wide">Où signaler</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-700 text-xs uppercase tracking-wide">Comment</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-700 text-xs uppercase tracking-wide">Délai de traitement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportTypes.map(({ where, how, delay, icon }) => (
                    <tr key={where} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-900 font-medium">
                        <span className="mr-2">{icon}</span>{where}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{how}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                          <Clock className="w-3 h-3" /> {delay}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ce qui se passe après un signalement */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 px-6 py-4">
              <h3 className="font-black text-gray-900">Ce qu&apos;il se passe après votre signalement</h3>
            </div>
            <div className="p-6">
              <ol className="space-y-4">
                {[
                  { n: '①', title: 'Confirmation reçue', desc: 'Vous recevez une notification indiquant que votre signalement a bien été enregistré. Aucune information sur la suite n\'est communiquée à ce stade.', color: 'text-sky-700' },
                  { n: '②', title: 'Examen confidentiel', desc: 'Un modérateur examine le contenu signalé. La personne concernée n\'est pas informée de l\'identité du signalant — l\'anonymat est garanti.', color: 'text-violet-700' },
                  { n: '③', title: 'Décision', desc: 'Le contenu est conservé, modéré ou supprimé. En cas de suppression, la personne concernée reçoit un motif. Vous recevez une notification de clôture.', color: 'text-emerald-700' },
                  { n: '④', title: 'Bilan mensuel', desc: 'Biguglia Connect publie des statistiques anonymisées de modération chaque mois pour vous montrer que les signalements ont bien été traités.', color: 'text-amber-700' },
                ].map(({ n, title, desc, color }) => (
                  <li key={n} className="flex items-start gap-4">
                    <span className={`text-2xl font-black flex-shrink-0 ${color}`}>{n}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>
                      <p className="text-gray-600 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Avertissement anti-abus */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm leading-relaxed">
              <strong>Signalements abusifs :</strong> Signaler de façon répétée et injustifiée un même contenu ou un même utilisateur est considéré comme un abus.
              Le compte signalant peut être suspendu si le comportement persiste.
              Le signalement est un outil de protection, pas d&apos;intimidation.
            </p>
          </div>
        </section>

        {/* ── 4. SYSTÈME DE CONFIANCE ──────────────────────────────────── */}
        <section id="confiance" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-amber-100 rounded-2xl">
              <Shield className="w-6 h-6 text-amber-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Le système de confiance</h2>
              <p className="text-gray-500 text-sm mt-0.5">Comprendre les badges, les niveaux et ce qu&apos;ils signifient vraiment</p>
            </div>
          </div>

          {/* Explication du principe */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Comment fonctionne la confiance sur Biguglia Connect ?
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                La confiance ici ne s&apos;achète pas — elle se gagne. Elle repose sur <strong>trois piliers indépendants</strong> :
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    num: '1',
                    title: 'Vérification documentaire',
                    desc: 'Pour les artisans : SIRET actif + assurance valide, vérifiés par un humain. Ce pilier dit "cette personne existe et est enregistrée légalement."',
                    color: 'bg-brand-50 border-brand-100',
                    numColor: 'bg-brand-500',
                  },
                  {
                    num: '2',
                    title: 'Réputation par les avis',
                    desc: 'Notes et avis laissés par des membres authentifiés après une interaction réelle. Ce pilier dit "d\'autres personnes ont eu une bonne expérience."',
                    color: 'bg-amber-50 border-amber-100',
                    numColor: 'bg-amber-500',
                  },
                  {
                    num: '3',
                    title: 'Historique comportemental',
                    desc: 'Ancienneté du compte, absence de sanctions, respect des règles. Ce pilier dit "cette personne se comporte de manière fiable dans le temps."',
                    color: 'bg-sky-50 border-sky-100',
                    numColor: 'bg-sky-500',
                  },
                ].map(({ num, title, desc, color, numColor }) => (
                  <div key={num} className={`rounded-2xl border p-4 ${color}`}>
                    <div className={`w-7 h-7 ${numColor} rounded-full text-white text-sm font-black flex items-center justify-center mb-3`}>{num}</div>
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{title}</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Niveaux de confiance */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Niveaux de confiance et leurs droits
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {trustLevels.map(({ badge, condition, perms, limits, color, badgeColor }) => (
                <div key={badge} className={`rounded-2xl border p-4 ${color}`}>
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    <span className={`inline-flex items-center font-bold text-sm px-3 py-1.5 rounded-full ${badgeColor}`}>
                      {badge}
                    </span>
                    <p className="text-gray-600 text-xs mt-1.5 flex-1 min-w-[200px]">{condition}</p>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {perms.length > 0 && (
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Accès
                        </p>
                        <ul className="space-y-1">
                          {perms.map(p => (
                            <li key={p} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-emerald-500 mt-0.5 flex-shrink-0">▸</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {limits.length > 0 && (
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Limites
                        </p>
                        <ul className="space-y-1">
                          {limits.map(l => (
                            <li key={l} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span> {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ce que les badges NE signifient PAS */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-500" />
                Ce que les badges NE garantissent pas
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Soyons honnêtes. La transparence, c&apos;est aussi dire ce que nous ne pouvons pas garantir :
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'La qualité du travail réalisé — seuls vos avis évaluent cela.', icon: Star },
                  { text: 'L\'absence de tout défaut ou mauvaise expérience future — personne ne peut le promettre.', icon: AlertTriangle },
                  { text: 'La disponibilité ou les délais de réponse d\'un artisan.', icon: Clock },
                  { text: 'La résolution de litiges privés — nous facilitons, nous ne jugeons pas.', icon: MessageSquare },
                ].map(({ text, icon: Icon }) => (
                  <li key={text} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Comment gagner en confiance */}
          <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <p className="text-sky-800 text-sm leading-relaxed">
              <strong>Comment progresser ?</strong> Complétez votre profil, répondez aux messages, récoltez des avis après chaque échange,
              respectez les règles. La confiance vient naturellement avec le temps et la régularité.
            </p>
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-3xl p-8 text-center">
          <div className="inline-flex p-3 bg-brand-500/20 rounded-2xl mb-4 border border-brand-500/30">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-3">
            Des questions sur ces règles ?
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Notre équipe est disponible pour expliquer ou clarifier n&apos;importe quelle règle.
            Nous préférons la pédagogie à la sanction.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/confiance"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-500 transition-colors"
            >
              <Shield className="w-4 h-4" /> Page Confiance &amp; Sécurité
            </Link>
            <Link
              href="/aide"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm border border-white/15 hover:bg-white/20 transition-colors backdrop-blur"
            >
              Centre d&apos;aide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
