import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';

const CATEGORY_LINKS = [
  { href: '/annonces?categorie=vehicule',       label: '🚗 Véhicules' },
  { href: '/annonces?categorie=mobilier',       label: '🪑 Mobilier & Déco' },
  { href: '/annonces?categorie=electronique',   label: '📱 Électronique' },
  { href: '/annonces?categorie=electromenager', label: '🧺 Électroménager' },
  { href: '/annonces?categorie=vetement',       label: '👕 Vêtements' },
  { href: '/annonces?categorie=sport',          label: '⚽ Sport & Loisirs' },
  { href: '/annonces?categorie=maison',         label: '🏡 Maison & Jardin' },
  { href: '/annonces?type=don',                 label: '🎁 Dons gratuits' },
];

const RELATED_LINKS = [
  { href: '/materiel',                 label: '🛠️ Matériel à emprunter' },
  { href: '/collectionneurs',          label: '🏆 Collectionneurs' },
  { href: '/perdu-trouve',             label: '🔍 Objets perdus' },
  { href: '/evenements-biguglia',      label: '🎉 Vide-greniers & marchés' },
  { href: '/artisans-biguglia',        label: '🔧 Artisans — réparations' },
  { href: '/forum?categorie=annonces', label: '📢 Forum Annonces' },
  { href: '/coups-de-main',            label: '🤝 Coups de main' },
];

const INTERNAL_LINKS = [
  { href: '/materiel',            emoji: '🛠️', title: 'Matériel partagé',        desc: 'Prêt & location de matériel entre voisins' },
  { href: '/collectionneurs',     emoji: '🏆', title: 'Collectionneurs',          desc: 'Échanges entre passionnés de collection' },
  { href: '/perdu-trouve',        emoji: '🔍', title: 'Objets perdus & trouvés', desc: 'Signalez ou retrouvez un objet' },
  { href: '/artisans-biguglia',   emoji: '🔧', title: 'Artisans à Biguglia',     desc: 'Travaux, réparations — artisans vérifiés' },
  { href: '/evenements-biguglia', emoji: '🎉', title: 'Événements à Biguglia',   desc: 'Vide-greniers & marchés locaux' },
  { href: '/forum-biguglia',      emoji: '💬', title: 'Forum des habitants',     desc: 'Recommandations & bons plans locaux' },
  { href: '/services-biguglia',   emoji: '🛠️', title: 'Services locaux',          desc: 'Artisans & prestataires vérifiés' },
  { href: '/coups-de-main',       emoji: '🤝', title: 'Coups de main',           desc: 'Entraide et services de voisinage' },
];

/** Liens rapides par catégorie + maillage interne */
export default function AnnoncesLiens() {
  return (
    <>
      {/* ── Accès direct par catégorie ── */}
      <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 mb-2">
          Parcourir par catégorie — Accès direct
        </h2>
        <p className="text-gray-500 text-sm mb-5">
          Filtrez les annonces de Biguglia par catégorie ou type pour trouver exactement ce que vous cherchez.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Par catégorie</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Contenus locaux associés</p>
            <div className="flex flex-wrap gap-2">
              {RELATED_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Maillage interne ── */}
      <section>
        <h2 className="text-xl font-black text-gray-900 mb-4">
          Autres ressources locales à {GEO.city}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTERNAL_LINKS.map(l => (
            <Link key={l.href} href={l.href}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-colors flex items-center gap-3">
                <span className="text-xl">{l.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{l.title}</p>
                  <p className="text-xs text-gray-500">{l.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
