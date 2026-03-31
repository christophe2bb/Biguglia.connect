'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield, ChevronLeft, ChevronDown, ChevronUp,
  CheckCircle2, Circle, ExternalLink, Copy, Check,
  Globe, Zap, Lock, AlertTriangle, Info, ArrowRight,
} from 'lucide-react';

// ─── Données du guide ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    emoji: '📧',
    title: 'Créer un compte Cloudflare gratuit',
    duration: '2 min',
    color: 'orange',
    actions: [
      {
        type: 'link',
        label: 'Ouvrir cloudflare.com/fr-fr',
        url: 'https://dash.cloudflare.com/sign-up',
        desc: 'Clique sur ce bouton — il ouvre Cloudflare dans un nouvel onglet',
      },
    ],
    instructions: [
      'Sur la page Cloudflare, clique sur "S\'inscrire" (ou Sign Up)',
      'Entre ton adresse email et choisis un mot de passe',
      'Clique sur "Créer un compte"',
      'Vérifie ton email et clique sur le lien de confirmation',
      '→ Tu arrives sur le tableau de bord Cloudflare',
    ],
  },
  {
    id: 2,
    emoji: '🌐',
    title: 'Ajouter ton domaine biguglia-connect.fr',
    duration: '3 min',
    color: 'blue',
    actions: [
      {
        type: 'link',
        label: 'Aller sur le tableau de bord Cloudflare',
        url: 'https://dash.cloudflare.com',
        desc: 'Connecte-toi à ton compte Cloudflare',
      },
    ],
    instructions: [
      'Sur le tableau de bord, clique sur le bouton bleu "+ Ajouter un site"',
      'Dans le champ, tape exactement : biguglia-connect.fr',
      'Clique sur "Continuer"',
      'Cloudflare te propose des plans → choisis "Free" (gratuit) tout en bas',
      'Clique sur "Continuer" — Cloudflare scanne tes DNS actuels automatiquement',
      '→ Tu vois une liste de tes enregistrements DNS détectés',
      'Clique sur "Continuer" sans rien modifier',
    ],
  },
  {
    id: 3,
    emoji: '🔑',
    title: 'Récupérer les serveurs DNS Cloudflare',
    duration: '1 min',
    color: 'purple',
    actions: [],
    instructions: [
      'Cloudflare t\'affiche 2 "Nameservers" (serveurs de noms)',
      'Ils ressemblent à : xxx.ns.cloudflare.com et yyy.ns.cloudflare.com',
      '⚠️ IMPORTANT : note ces 2 adresses — tu en as besoin à l\'étape suivante',
      'Laisse cette page Cloudflare ouverte dans un onglet',
    ],
    tip: 'Les nameservers ressemblent à "anna.ns.cloudflare.com" et "bob.ns.cloudflare.com" — chaque compte a les siens.',
  },
  {
    id: 4,
    emoji: '🏠',
    title: 'Changer les DNS chez ton registrar',
    duration: '5 min',
    color: 'red',
    actions: [],
    subSteps: [
      {
        registrar: 'OVH (le plus courant en France)',
        url: 'https://www.ovh.com/manager/#/web/domain',
        steps: [
          'Va sur ovh.com/manager → Domaines → biguglia-connect.fr',
          'Clique sur l\'onglet "Serveurs DNS"',
          'Clique sur "Modifier les serveurs DNS"',
          'Supprime les serveurs actuels',
          'Ajoute les 2 serveurs Cloudflare (un par champ)',
          'Clique sur "Appliquer la configuration" → confirme',
        ],
      },
      {
        registrar: 'Gandi',
        url: 'https://admin.gandi.net/domain',
        steps: [
          'Va sur admin.gandi.net → Domaine → biguglia-connect.fr',
          'Clique sur "Serveurs de noms"',
          'Clique sur "Changer" ou l\'icône crayon',
          'Remplace par les 2 serveurs Cloudflare',
          'Clique sur "Enregistrer"',
        ],
      },
      {
        registrar: 'Ionos / 1&1',
        url: 'https://my.ionos.fr/domains',
        steps: [
          'Va sur my.ionos.fr → Domaines & SSL → biguglia-connect.fr',
          'Clique sur "Serveurs DNS" puis "Modifier"',
          'Sélectionne "Serveurs de noms personnalisés"',
          'Entre les 2 serveurs Cloudflare',
          'Clique sur "Enregistrer"',
        ],
      },
      {
        registrar: 'Namecheap',
        url: 'https://ap.www.namecheap.com/domains/list',
        steps: [
          'Va sur namecheap.com → Domain List → biguglia-connect.fr',
          'Clique sur "Manage" puis "Nameservers"',
          'Sélectionne "Custom DNS" dans le menu déroulant',
          'Entre les 2 serveurs Cloudflare',
          'Clique sur la coche verte pour sauvegarder',
        ],
      },
    ],
    instructions: [
      '⏳ La propagation DNS prend entre 5 minutes et 24h (souvent < 30 min)',
      'Cloudflare t\'enverra un email quand c\'est actif',
    ],
  },
  {
    id: 5,
    emoji: '✅',
    title: 'Vérifier que Cloudflare est actif',
    duration: '1 min',
    color: 'green',
    actions: [
      {
        type: 'link',
        label: 'Vérifier les DNS sur whatsmydns.net',
        url: 'https://www.whatsmydns.net/#NS/biguglia-connect.fr',
        desc: 'Ce site vérifie en direct si tes DNS ont propagé partout dans le monde',
      },
    ],
    instructions: [
      'Sur whatsmydns.net, tu dois voir "cloudflare.com" dans les résultats',
      'Retourne sur Cloudflare → ton site doit avoir le statut "Actif" (pastille verte)',
      '→ Cloudflare protège maintenant ton site !',
    ],
  },
  {
    id: 6,
    emoji: '⚡',
    title: 'Activer les protections Cloudflare',
    duration: '5 min',
    color: 'yellow',
    actions: [
      {
        type: 'link',
        label: 'Aller sur le tableau de bord Cloudflare',
        url: 'https://dash.cloudflare.com',
        desc: 'Sélectionne biguglia-connect.fr dans la liste',
      },
    ],
    protections: [
      {
        name: 'Bot Fight Mode',
        path: 'Sécurité → Bots',
        action: 'Active le switch "Bot Fight Mode"',
        desc: 'Bloque automatiquement les bots malveillants et scrapers',
        level: 'Gratuit',
        recommended: true,
      },
      {
        name: 'WAF — Règles gérées',
        path: 'Sécurité → WAF',
        action: 'Active "Cloudflare Managed Rules"',
        desc: 'Règles anti-injection SQL, XSS, attaques connues',
        level: 'Gratuit',
        recommended: true,
      },
      {
        name: 'DDoS Protection',
        path: 'Activé automatiquement',
        action: 'Rien à faire — actif par défaut sur tous les plans',
        desc: 'Protection DDoS Layer 3/4 automatique',
        level: 'Gratuit',
        recommended: true,
      },
      {
        name: 'SSL/TLS Mode',
        path: 'SSL/TLS → Vue d\'ensemble',
        action: 'Sélectionne "Full (strict)"',
        desc: 'Chiffrement bout en bout entre visiteur → Cloudflare → Vercel',
        level: 'Gratuit',
        recommended: true,
      },
      {
        name: 'HTTPS automatique',
        path: 'SSL/TLS → Edge Certificates',
        action: 'Active "Always Use HTTPS" et "Automatic HTTPS Rewrites"',
        desc: 'Force HTTPS sur toutes les connexions',
        level: 'Gratuit',
        recommended: true,
      },
      {
        name: 'Under Attack Mode',
        path: 'Sécurité → Vue d\'ensemble',
        action: 'À activer UNIQUEMENT en cas d\'attaque en cours',
        desc: 'Affiche un challenge CAPTCHA à tous les visiteurs pendant 5 sec',
        level: 'Gratuit',
        recommended: false,
      },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
  green:  { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
};

// ─── Composant étape ───────────────────────────────────────────────────────────
function StepCard({
  step,
  done,
  onToggleDone,
}: {
  step: typeof STEPS[0];
  done: boolean;
  onToggleDone: () => void;
}) {
  const [open, setOpen] = useState(step.id === 1);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const c = COLOR_MAP[step.color];

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${done ? 'border-emerald-300 bg-emerald-50/30' : `${c.border} bg-white`}`}>
      {/* ── Header cliquable ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          className="flex-shrink-0 transition-transform hover:scale-110"
          title={done ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          {done
            ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            : <Circle className="w-7 h-7 text-gray-300" />
          }
        </button>
        <span className="text-2xl flex-shrink-0">{step.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-black text-base ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              Étape {step.id} · {step.title}
            </span>
          </div>
          <span className="text-xs text-gray-400">⏱ {step.duration}</span>
        </div>
        <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
          {open ? 'Masquer' : 'Voir'}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* ── Contenu dépliable ── */}
      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Boutons d'action (liens externes) */}
          {step.actions && step.actions.length > 0 && (
            <div className="space-y-2">
              {step.actions.map((action, i) => (
                <div key={i} className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                  <p className="text-xs text-gray-500 mb-2">{action.desc}</p>
                  <a
                    href={action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {action.label}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Instructions texte */}
          {step.instructions && step.instructions.length > 0 && (
            <div className="space-y-2">
              {step.instructions.map((inst, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full ${c.badge} text-xs font-black flex items-center justify-center mt-0.5`}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{inst}</p>
                </div>
              ))}
            </div>
          )}

          {/* Astuce */}
          {step.tip && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">{step.tip}</p>
            </div>
          )}

          {/* Sous-étapes par registrar */}
          {step.subSteps && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700">Choisis ton hébergeur de domaine :</p>
              {step.subSteps.map((sub, si) => (
                <RegistrarBlock key={si} sub={sub} copyText={copyText} copiedIdx={copiedIdx} idx={si} />
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Tu ne sais pas où est ton domaine ?</strong> Regarde la facture où tu as acheté biguglia-connect.fr,
                  ou tape <strong>biguglia-connect.fr</strong> sur{' '}
                  <a href="https://www.whois.com/whois/biguglia-connect.fr" target="_blank" rel="noopener noreferrer" className="underline font-bold">whois.com</a>{' '}
                  — le champ "Registrar" te dit où aller.
                </p>
              </div>
            </div>
          )}

          {/* Protections Cloudflare */}
          {step.protections && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700 mb-3">Active ces protections une par une :</p>
              {step.protections.map((prot, pi) => (
                <div key={pi} className={`rounded-xl border p-3 ${prot.recommended ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{prot.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{prot.level}</span>
                        {prot.recommended && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">✅ Recommandé</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{prot.desc}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-gray-600">
                      <span className="font-bold text-gray-700">{prot.path}</span> → {prot.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton "Marquer comme fait" */}
          <button
            type="button"
            onClick={onToggleDone}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              done
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
            }`}
          >
            {done ? '↩ Marquer comme non fait' : '✅ Étape terminée !'}
          </button>
        </div>
      )}
    </div>
  );
}

function RegistrarBlock({
  sub, copyText, copiedIdx, idx,
}: {
  sub: { registrar: string; url: string; steps: string[] };
  copyText: (t: string, i: number) => void;
  copiedIdx: number | null;
  idx: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-bold text-sm text-gray-800">{sub.registrar}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          <a
            href={sub.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Ouvrir {sub.registrar}
          </a>
          {sub.steps.map((step, si) => (
            <div key={si} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-xs font-black flex items-center justify-center mt-0.5 text-gray-700">
                {si + 1}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function SecuritePage() {
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  const toggleDone = (id: number) => {
    setDoneSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const progress = Math.round((doneSteps.size / STEPS.length) * 100);
  const allDone  = doneSteps.size === STEPS.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* ── Retour ── */}
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour Admin
      </Link>

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-orange-100 rounded-2xl">
          <Shield className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Protection Cloudflare</h1>
          <p className="text-gray-500 text-sm">Guide pas à pas — WAF, anti-DDoS, anti-bot</p>
        </div>
      </div>

      {/* ── Bannière info ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800 text-sm">Cloudflare gratuit suffit pour Biguglia Connect</p>
            <p className="text-blue-700 text-xs mt-1">
              Le plan Free inclut : protection DDoS illimitée, WAF basique, Bot Fight Mode, SSL automatique,
              CDN mondial. Pas besoin de payer.
            </p>
          </div>
        </div>
      </div>

      {/* ── Barre de progression ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">Progression</span>
          <span className={`text-sm font-black ${allDone ? 'text-emerald-600' : 'text-gray-500'}`}>
            {doneSteps.size} / {STEPS.length} étapes
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-orange-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-3 flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-bold">🎉 Cloudflare est configuré ! Ton site est protégé.</span>
          </div>
        )}
      </div>

      {/* ── Étapes ── */}
      <div className="space-y-3">
        {STEPS.map(step => (
          <StepCard
            key={step.id}
            step={step}
            done={doneSteps.has(step.id)}
            onToggleDone={() => toggleDone(step.id)}
          />
        ))}
      </div>

      {/* ── Ce que tu as déjà (rassurant) ── */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h2 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          Ce qui est déjà en place sur le site
        </h2>
        <div className="space-y-2">
          {[
            { label: 'Content-Security-Policy (CSP)', desc: 'Bloque les scripts injectés' },
            { label: 'HSTS Strict-Transport-Security', desc: 'Force HTTPS à vie' },
            { label: 'X-Frame-Options DENY', desc: 'Anti-clickjacking' },
            { label: 'X-Content-Type-Options nosniff', desc: 'Anti-MIME sniffing' },
            { label: 'Permissions-Policy', desc: 'Caméra, micro, géo désactivés' },
            { label: 'Rate-limiting dans le middleware', desc: '120 req/min, blocage 5 min' },
            { label: 'Anti-bot (sqlmap, nikto, UA vides…)', desc: 'Bots malveillants bloqués' },
            { label: 'Protection /admin', desc: 'Redirige vers connexion si non connecté' },
            { label: 'Système de signalement', desc: 'Modération du contenu utilisateur' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                <span className="text-xs text-gray-500 ml-2">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Liens utiles ── */}
      <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Liens utiles
        </h2>
        <div className="space-y-2">
          {[
            { label: 'Tableau de bord Cloudflare', url: 'https://dash.cloudflare.com' },
            { label: 'Vérifier la propagation DNS', url: 'https://www.whatsmydns.net/#NS/biguglia-connect.fr' },
            { label: 'WHOIS — trouver ton registrar', url: 'https://www.whois.com/whois/biguglia-connect.fr' },
            { label: 'Tester tes headers de sécurité', url: 'https://securityheaders.com/?q=biguglia-connect.fr' },
            { label: 'Score sécurité SSL', url: 'https://www.ssllabs.com/ssltest/analyze.html?d=biguglia-connect.fr' },
          ].map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
