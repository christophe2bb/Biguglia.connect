import type { Metadata } from 'next';
import {
  Shield, CheckCircle, AlertTriangle, MessageSquare,
  UserCheck, FileText, Star, Users, Lock, Flag,
  ArrowRight, Eye, Handshake,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Confiance & Sécurité — Biguglia Connect',
  description: 'Comment Biguglia Connect vérifie les artisans, protège vos données et modère les contenus.',
};

export default function ConfidencePage() {
  return (
    <div className="overflow-hidden">

      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-4 bg-emerald-400/15 rounded-3xl border border-emerald-400/25 mb-6">
            <Shield className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Confiance &amp; Sécurité
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Chez Biguglia Connect, chaque décision est pensée pour vous protéger.
            Voici exactement comment nous fonctionnons — sans langue de bois.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">

        {/* 1 — Vérification des artisans */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-emerald-100 rounded-xl">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </span>
              Comment on vérifie les artisans
            </h2>
          </div>
          <div className="p-6">
            {/* Timeline */}
            <div className="space-y-0">
              {[
                { num: 1, title: 'Inscription', desc: 'L\'artisan crée un compte et choisit son type (professionnel ou bénévole/particulier).', color: 'bg-brand-500' },
                { num: 2, title: 'Dossier complet', desc: 'Il complète son profil : métier, zone d\'intervention, description, et pour les professionnels : SIRET, assurance RC Pro (attestation en cours de validité).', color: 'bg-orange-500' },
                { num: 3, title: 'Vérification manuelle', desc: 'Un administrateur humain examine chaque dossier : authenticité des documents, cohérence des informations, vérification SIRET sur le registre officiel.', color: 'bg-amber-500' },
                { num: 4, title: 'Décision', desc: 'Validé → badge "✅ Vérifié" + profil visible. Refusé → l\'artisan reçoit un motif précis et peut corriger son dossier.', color: 'bg-emerald-500' },
                { num: 5, title: 'Suivi continu', desc: 'Un artisan peut être re-vérifié ou suspendu à tout moment si un signalement est déposé ou si ses documents expirent.', color: 'bg-blue-500' },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex gap-4 pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 ${step.color} rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>{step.num}</div>
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2 mb-2 min-h-[1.5rem]" />}
                  </div>
                  <div className={`${i < arr.length - 1 ? 'pb-5' : ''}`}>
                    <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-emerald-800 text-sm font-medium flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <span>Un profil artisan en attente n&apos;est <strong>jamais visible</strong> par le public.
                Seuls les profils validés apparaissent dans les résultats de recherche.</span>
              </p>
            </div>
          </div>
        </section>

        {/* 2 — Ce que signifie "Vérifié" */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-sky-100 rounded-xl">
                <FileText className="w-5 h-5 text-sky-600" />
              </span>
              Que signifie le badge &ldquo;Vérifié&rdquo; ?
            </h2>
          </div>
          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { check: true,  text: 'Identité confirmée (nom, prénom, email)' },
                { check: true,  text: 'SIRET vérifié et actif (pour les pros)' },
                { check: true,  text: 'Attestation d\'assurance RC Pro ou décennale en cours de validité' },
                { check: true,  text: 'Profil relu et approuvé par un administrateur humain' },
                { check: false, text: 'Ce n\'est PAS une certification de qualité de travail' },
                { check: false, text: 'La note étoiles reste la seule mesure de satisfaction client' },
              ].map(({ check, text }) => (
                <div key={text} className={`flex items-start gap-2.5 p-3 rounded-xl ${check ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  {check
                    ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  }
                  <span className={`text-sm ${check ? 'text-emerald-800' : 'text-amber-800'}`}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 — Avis contrôlés */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-amber-100 rounded-xl">
                <Star className="w-5 h-5 text-amber-600" />
              </span>
              Comment les avis sont contrôlés
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              Le système d&apos;avis est conçu pour être impossible à manipuler :
            </p>
            <ul className="space-y-3">
              {[
                'Seul un membre inscrit et authentifié peut laisser un avis.',
                'L\'artisan ne peut pas supprimer ni masquer les avis négatifs.',
                'Un avis signalé est examiné par un modérateur humain sous 24–48h.',
                'Les notes sont calculées sur la totalité des avis visibles — pas de sélection artificielle.',
                'Un artisan qui répond à un avis négatif est mis en avant positivement.',
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-amber-600" />
                  </span>
                  <span className="text-gray-700 text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 — Qui modère */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-purple-100 rounded-xl">
                <Eye className="w-5 h-5 text-purple-600" />
              </span>
              Qui modère la plateforme ?
            </h2>
          </div>
          <div className="p-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  role: 'Administrateur',
                  icon: Shield,
                  color: 'bg-brand-100 text-brand-700',
                  tasks: ['Valide / refuse les artisans', 'Révoque les badges', 'Gère les comptes utilisateurs', 'Accède aux documents confidentiels'],
                },
                {
                  role: 'Modérateur',
                  icon: Users,
                  color: 'bg-purple-100 text-purple-700',
                  tasks: ['Traite les signalements', 'Supprime le contenu illicite', 'Ferme les sujets problématiques', 'Escalade vers l\'admin si besoin'],
                },
                {
                  role: 'Communauté',
                  icon: Handshake,
                  color: 'bg-emerald-100 text-emerald-700',
                  tasks: ['Signale les abus', 'Note les artisans', 'Recommande ou déconseille', 'Contribue au forum'],
                },
              ].map(({ role, icon: Icon, color, tasks }) => (
                <div key={role} className="bg-gray-50 rounded-2xl p-4">
                  <div className={`inline-flex items-center gap-2 ${color} rounded-full px-3 py-1.5 mb-3 text-sm font-bold`}>
                    <Icon className="w-4 h-4" /> {role}
                  </div>
                  <ul className="space-y-2">
                    {tasks.map(t => (
                      <li key={t} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-gray-300 mt-0.5">▸</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — Signaler un abus */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-rose-100 rounded-xl">
                <Flag className="w-5 h-5 text-rose-600" />
              </span>
              Comment signaler un abus
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: 'Sur un profil', desc: 'Bouton "Signaler" disponible sur chaque fiche artisan. Motifs prédéfinis + commentaire libre.', icon: '👤' },
                { title: 'Sur une annonce', desc: 'Icône drapeau rouge sur chaque annonce. Traitement sous 24h ouvré.', icon: '📦' },
                { title: 'Sur un message', desc: 'Via le menu de la conversation. Le modérateur peut consulter le fil complet.', icon: '💬' },
              ].map(({ title, desc, icon }) => (
                <div key={title} className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-2xl mb-2">{icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <p className="text-rose-800 text-sm font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Tout signalement abusif ou de mauvaise foi peut entraîner la suspension du compte signalant.
                Le système de signalement doit rester un outil de protection, pas de harcèlement.</span>
              </p>
            </div>
          </div>
        </section>

        {/* 6 — Garde-fous */}
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 px-6 py-5">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="inline-flex p-2 bg-indigo-100 rounded-xl">
                <Lock className="w-5 h-5 text-indigo-600" />
              </span>
              Garde-fous &amp; responsabilités
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                title: 'Données personnelles',
                text: 'Vos informations ne sont jamais revendues. Conformité RGPD. Suppression complète sur demande dans les 72h.',
                icon: Lock, color: 'bg-indigo-50 border-indigo-100',
              },
              {
                title: 'Faux profils',
                text: 'La vérification manuelle élimine la grande majorité des faux profils. Tout profil suspect signalé est suspendu dans les 12h.',
                icon: UserCheck, color: 'bg-emerald-50 border-emerald-100',
              },
              {
                title: 'Matériel prêté',
                text: 'Le prêt s\'effectue entre particuliers. Biguglia Connect facilite la mise en relation mais n\'est pas responsable de l\'état ou de la perte de matériel. Évaluez avant d\'emprunter.',
                icon: AlertTriangle, color: 'bg-amber-50 border-amber-100',
              },
              {
                title: 'Litiges entre membres',
                text: 'En cas de litige, contactez-nous via la messagerie interne. Nous pouvons jouer un rôle de médiation, mais la résolution légale reste entre les parties concernées.',
                icon: Handshake, color: 'bg-purple-50 border-purple-100',
              },
              {
                title: 'Arnaque / usurpation',
                text: 'Ne payez jamais en dehors de la plateforme sur la base d\'une seule conversation. Signalez immédiatement toute demande de virement inhabituelle.',
                icon: MessageSquare, color: 'bg-rose-50 border-rose-100',
              },
            ].map(({ title, text, icon: Icon, color }) => (
              <div key={title} className={`flex items-start gap-4 border rounded-2xl p-4 ${color}`}>
                <Icon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7 — Contact */}
        <section className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-3xl p-8 text-center">
          <div className="inline-flex p-3 bg-brand-500/20 rounded-2xl mb-4 border border-brand-500/30">
            <MessageSquare className="w-6 h-6 text-brand-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-3">Une question ou un doute ?</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Notre équipe répond sous 24–48h à toute question concernant la sécurité, la confiance ou les procédures de validation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/messages"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-500 transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Contacter l&apos;équipe
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
