import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Info,
  MessageSquare, Eye, Lock, Users, ArrowLeft, ArrowRight,
  ThumbsUp, Flag, Clock, Star,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Charte du forum — Biguglia Connect',
  description:
    'Découvrez les règles et engagements qui régissent le forum de Biguglia Connect : respect, vie locale, modération et bonne entente entre voisins.',
  alternates: { canonical: `${SITE_URL}/forum/charte` },
  openGraph: {
    title:       'Charte du forum — Biguglia Connect',
    description: 'Règles de bonne conduite, engagements mutuels et fonctionnement de la modération du forum Biguglia Connect.',
    url:         `${SITE_URL}/forum/charte`,
    type:        'website',
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const corePrinciples = [
  {
    icon: '✅',
    title: 'Respect et bienveillance',
    desc: 'Chaque membre s\'exprime avec courtoisie, même en cas de désaccord. Les attaques personnelles, insultes ou propos méprisants sont supprimés immédiatement.',
    color: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    descColor: 'text-emerald-700',
  },
  {
    icon: '📍',
    title: 'Vie locale Biguglia',
    desc: 'Les sujets doivent être liés à la vie locale de Biguglia et ses environs : vie de quartier, questions pratiques, événements, entraide entre habitants.',
    color: 'bg-sky-50 border-sky-100',
    iconBg: 'bg-sky-100',
    textColor: 'text-sky-900',
    descColor: 'text-sky-700',
  },
  {
    icon: '🔍',
    title: 'Pas de doublons',
    desc: 'Avant de créer un sujet, vérifiez qu\'il n\'existe pas déjà. Le forum propose une recherche de sujets similaires lors de la création.',
    color: 'bg-violet-50 border-violet-100',
    iconBg: 'bg-violet-100',
    textColor: 'text-violet-900',
    descColor: 'text-violet-700',
  },
  {
    icon: '📷',
    title: 'Photos adaptées',
    desc: 'Maximum 3 photos par sujet, compressées et pertinentes. Aucune image à caractère personnel sans consentement explicite des personnes représentées.',
    color: 'bg-amber-50 border-amber-100',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-900',
    descColor: 'text-amber-700',
  },
  {
    icon: '🔒',
    title: 'Données personnelles',
    desc: 'Ne publiez pas d\'adresses complètes, numéros de téléphone, données de santé ou autres informations personnelles sensibles vous concernant ou concernant des tiers.',
    color: 'bg-rose-50 border-rose-100',
    iconBg: 'bg-rose-100',
    textColor: 'text-rose-900',
    descColor: 'text-rose-700',
  },
  {
    icon: '🚫',
    title: 'Publicité et spam',
    desc: 'Les messages commerciaux, le démarchage, les liens d\'affiliation et le spam sont interdits. Un artisan peut se présenter dans la section dédiée, pas dans le forum.',
    color: 'bg-gray-50 border-gray-100',
    iconBg: 'bg-gray-100',
    textColor: 'text-gray-900',
    descColor: 'text-gray-700',
  },
];

const allowedContent = [
  { allowed: true,  text: 'Questions pratiques liées au quotidien à Biguglia' },
  { allowed: true,  text: 'Informations utiles : travaux, coupures, événements' },
  { allowed: true,  text: 'Demandes d\'entraide et de conseils entre voisins' },
  { allowed: true,  text: 'Recommandations de bonnes adresses locales' },
  { allowed: true,  text: 'Propositions et idées pour améliorer la commune' },
  { allowed: true,  text: 'Alertes de vigilance douce (non-policière)' },
  { allowed: false, text: 'Politique partisane et débats électoraux' },
  { allowed: false, text: 'Contenus haineux, discriminatoires ou diffamatoires' },
  { allowed: false, text: 'Vente, troc ou offres d\'emploi (utilisez les rubriques dédiées)' },
  { allowed: false, text: 'Informations non vérifiées présentées comme certaines' },
  { allowed: false, text: 'Coordonnées personnelles d\'autrui sans consentement' },
  { allowed: false, text: 'Contenus à caractère sexuel ou violent' },
];

const moderationSteps = [
  {
    n: '1',
    title: 'Publication immédiate',
    desc: 'Votre sujet est publié instantanément. Un filtre automatique surveille les mots-clés sensibles.',
    color: 'bg-sky-500',
  },
  {
    n: '2',
    title: 'Analyse automatique',
    desc: 'Un algorithme détecte les contenus potentiellement problématiques et les signale à la file de modération.',
    color: 'bg-violet-500',
  },
  {
    n: '3',
    title: 'Revue humaine',
    desc: 'Un modérateur examine les contenus signalés ou problématiques. Délai cible : 24 h en semaine.',
    color: 'bg-amber-500',
  },
  {
    n: '4',
    title: 'Décision et notification',
    desc: 'Le contenu est validé, modifié ou supprimé. En cas de suppression, vous recevez le motif par notification.',
    color: 'bg-emerald-500',
  },
  {
    n: '5',
    title: 'Recours possible',
    desc: 'Toute décision peut être contestée via la messagerie interne dans les 7 jours suivant la notification.',
    color: 'bg-gray-400',
  },
];

const sanctions = [
  {
    level: 'Avertissement',
    trigger: 'Première infraction mineure',
    action: 'Notification privée, contenu retiré',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  {
    level: 'Suspension temporaire',
    trigger: 'Récidive ou infraction grave',
    action: '7 à 30 jours selon la gravité',
    color: 'bg-orange-50 border-orange-200 text-orange-800',
  },
  {
    level: 'Suspension définitive',
    trigger: 'Infraction très grave ou récidive après suspension',
    action: 'Compte désactivé, données conservées 3 ans (RGPD)',
    color: 'bg-rose-50 border-rose-200 text-rose-800',
  },
];

const memberCommitments = [
  { icon: ThumbsUp,      text: 'Je lis un sujet existant avant d\'en créer un nouveau.' },
  { icon: MessageSquare, text: 'Je reste constructif même en exprimant un désaccord.' },
  { icon: Eye,           text: 'Je signale les contenus qui me semblent problématiques.' },
  { icon: Lock,          text: 'Je protège la vie privée des autres membres.' },
  { icon: Users,         text: 'Je contribue à une atmosphère chaleureuse entre voisins.' },
  { icon: Flag,          text: 'J\'accepte les décisions de modération de bonne foi.' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CharteForumPage() {
  return (
    <div className="overflow-hidden">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative py-20 bg-gradient-to-br from-violet-950 via-indigo-900 to-violet-900 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-400/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-400/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Back link */}
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 text-violet-300 hover:text-white text-sm font-medium transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour au forum
          </Link>

          <div className="inline-flex p-4 bg-violet-400/20 rounded-3xl border border-violet-400/30 mb-6">
            <Shield className="w-9 h-9 text-violet-300" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Charte du forum
          </h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Pour que le forum reste un espace d&apos;entraide bienveillant entre habitants de Biguglia,
            quelques règles simples s&apos;appliquent à tous. Elles tiennent en moins de 3 minutes.
          </p>

          {/* Quick-nav pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              { href: '#principes',   label: '✅ Principes' },
              { href: '#contenus',    label: '📋 Contenus autorisés' },
              { href: '#moderation',  label: '👁️ Modération' },
              { href: '#engagements', label: '🤝 Engagements' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">

        {/* ── 1. PRINCIPES FONDAMENTAUX ─────────────────────────────────────── */}
        <section id="principes" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-violet-100 rounded-2xl">
              <Shield className="w-6 h-6 text-violet-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Principes fondamentaux</h2>
              <p className="text-gray-500 text-sm mt-0.5">Les valeurs qui guident chaque échange sur le forum</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {corePrinciples.map(({ icon, title, desc, color, iconBg, textColor, descColor }) => (
              <div key={title} className={`rounded-2xl border p-4 ${color}`}>
                <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center text-lg mb-3`}>
                  {icon}
                </div>
                <h3 className={`font-bold text-sm mb-1 ${textColor}`}>{title}</h3>
                <p className={`text-xs leading-relaxed ${descColor}`}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Règle d'or */}
          <div className="mt-5 flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
            <p className="text-violet-800 text-sm leading-relaxed">
              <strong>Règle d&apos;or :</strong> si vous hésitez à publier quelque chose, demandez-vous —
              &ldquo;est-ce que mes voisins trouveraient cela utile et respectueux ?&rdquo;
              Si la réponse est non, reformulez ou abstenez-vous.
            </p>
          </div>
        </section>

        {/* ── 2. CONTENUS AUTORISÉS / INTERDITS ────────────────────────────── */}
        <section id="contenus" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-sky-100 rounded-2xl">
              <MessageSquare className="w-6 h-6 text-sky-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Contenus autorisés et interdits</h2>
              <p className="text-gray-500 text-sm mt-0.5">Ce qui est bienvenu et ce qui ne l&apos;est pas</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              {/* Autorisés */}
              <div className="p-6">
                <h3 className="font-black text-emerald-700 mb-4 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Autorisé
                </h3>
                <ul className="space-y-2.5">
                  {allowedContent.filter(i => i.allowed).map(({ text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Interdits */}
              <div className="p-6">
                <h3 className="font-black text-rose-700 mb-4 flex items-center gap-2 text-sm">
                  <XCircle className="w-4 h-4" /> Interdit
                </h3>
                <ul className="space-y-2.5">
                  {allowedContent.filter(i => !i.allowed).map(({ text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Note sur le hors-sujet */}
          <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm leading-relaxed">
              <strong>Hors-sujet :</strong> les annonces de vente, offres d&apos;emploi et événements ont leurs propres sections dédiées.
              Publiez-les dans les rubriques <Link href="/annonces" className="font-semibold underline underline-offset-2 hover:text-amber-900">Annonces</Link>,{' '}
              <Link href="/emploi/offres" className="font-semibold underline underline-offset-2 hover:text-amber-900">Emploi</Link> ou{' '}
              <Link href="/evenements" className="font-semibold underline underline-offset-2 hover:text-amber-900">Événements</Link> pour
              une meilleure visibilité.
            </p>
          </div>
        </section>

        {/* ── 3. MODÉRATION ─────────────────────────────────────────────────── */}
        <section id="moderation" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-indigo-100 rounded-2xl">
              <Eye className="w-6 h-6 text-indigo-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Fonctionnement de la modération</h2>
              <p className="text-gray-500 text-sm mt-0.5">Transparence totale sur le processus</p>
            </div>
          </div>

          {/* Principes clés */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                icon: ThumbsUp,
                title: 'Humaine d\'abord',
                desc: 'Toute décision finale est prise par une personne réelle. L\'automatisation ne fait que pré-trier.',
                color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
              },
              {
                icon: Clock,
                title: 'Délai affiché',
                desc: 'Délai cible : 24 h en semaine, 48 h le week-end. En cas de pic d\'activité, nous le communiquons.',
                color: 'bg-sky-50 border-sky-100 text-sky-700',
              },
              {
                icon: MessageSquare,
                title: 'Motif systématique',
                desc: 'Tout refus ou suppression est accompagné d\'une explication. Vous n\'êtes jamais laissé sans réponse.',
                color: 'bg-violet-50 border-violet-100 text-violet-700',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className={`rounded-2xl border p-4 ${color}`}>
                <Icon className="w-5 h-5 mb-2" />
                <h3 className="font-bold text-sm mb-1">{title}</h3>
                <p className="text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Processus */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <span className="text-violet-600">⟳</span> Processus de modération étape par étape
              </h3>
            </div>
            <div className="p-6 space-y-0">
              {moderationSteps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 ${step.color} rounded-full flex items-center justify-center text-white text-sm font-black`}>
                      {step.n}
                    </div>
                    {i < moderationSteps.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-2 mb-2 min-h-[1.5rem]" />
                    )}
                  </div>
                  <div className={i < moderationSteps.length - 1 ? 'pb-5' : ''}>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">{step.title}</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sanctions */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 px-6 py-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Échelle des sanctions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {sanctions.map(({ level, trigger, action, color }) => (
                <div key={level} className={`flex items-start gap-3 rounded-xl border p-3.5 ${color}`}>
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-1">{level}</p>
                    <p className="text-xs leading-relaxed opacity-90">
                      <strong>Déclencheur :</strong> {trigger}&nbsp;·&nbsp;<strong>Conséquence :</strong> {action}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2 italic">
                Les décisions peuvent être contestées via la messagerie interne dans les 7 jours suivant la notification.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. ENGAGEMENTS MUTUELS ───────────────────────────────────────── */}
        <section id="engagements" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex p-2.5 bg-emerald-100 rounded-2xl">
              <Users className="w-6 h-6 text-emerald-600" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Engagements mutuels</h2>
              <p className="text-gray-500 text-sm mt-0.5">Ce que vous pouvez attendre de nous, et ce que nous attendons de vous</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Notre engagement */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-violet-600" />
                </span>
                <h3 className="font-black text-gray-900 text-sm">Notre engagement envers vous</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Modération impartiale, sans favoritisme',
                  'Motif explicite pour toute suppression',
                  'Délai de traitement affiché et respecté',
                  'Anonymat garanti pour les signalements',
                  'Statistiques mensuelles de modération publiées',
                  'Droit de recours ouvert à tous les membres',
                ].map(text => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Star className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Votre engagement */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </span>
                <h3 className="font-black text-gray-900 text-sm">Votre engagement en tant que membre</h3>
              </div>
              <ul className="space-y-3">
                {memberCommitments.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA bas de page ──────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] rounded-3xl" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black mb-2">Prêt à participer ?</h2>
            <p className="text-violet-100 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Rejoignez la conversation, posez vos questions et aidez vos voisins.
              Le forum est là pour ça.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/forum"
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-2.5 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Voir le forum
              </Link>
              <Link
                href="/forum/nouveau"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                Créer un sujet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Lien vers règles générales ──────────────────────────────────── */}
        <div className="text-center text-sm text-gray-500">
          Cette charte s&apos;applique spécifiquement au forum. Pour les règles générales de la plateforme,
          consultez les{' '}
          <Link href="/regles" className="text-violet-600 hover:text-violet-800 font-semibold underline underline-offset-2">
            règles de la communauté
          </Link>.
        </div>

      </div>
    </div>
  );
}
