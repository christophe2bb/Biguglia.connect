import Link from 'next/link';
import { GEO } from '@/lib/seo/local-data';

const GUARANTEES = [
  { emoji: '🎁', title: '100 % gratuit',    desc: 'Déposer et consulter des annonces est entièrement gratuit.' },
  { emoji: '🔒', title: 'Voisins vérifiés', desc: "Chaque profil a un score de confiance basé sur l'historique." },
  { emoji: '📍', title: 'Échange local',    desc: 'Récupérez l\'objet directement à Biguglia, sans frais de port.' },
];

const QUICK_LINKS = [
  { href: '/annonces/nouvelle',  label: '+ Publier une annonce' },
  { href: '/annonces?type=don',  label: '🎁 Dons gratuits' },
  { href: '/materiel',           label: '🛠️ Matériel partagé' },
  { href: '/perdu-trouve',       label: '🔍 Objets perdus & trouvés' },
  { href: '/collectionneurs',    label: '🏆 Collectionneurs' },
];

export default function AnnoncesEdito() {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl font-black text-gray-900 mb-4">
        Les petites annonces à {GEO.city} : achetez et vendez local
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
        <div className="space-y-3">
          <p>
            Biguglia et sa plaine orientale constituent un bassin de vie dense avec une forte demande
            pour les échanges de proximité. Acheter et vendre localement permet de{' '}
            <strong>récupérer immédiatement</strong> l&apos;objet, d&apos;éviter les frais de port et de{' '}
            <strong>contribuer à l&apos;économie circulaire</strong> du village.
          </p>
          <p>
            Les objets les plus échangés entre habitants de Biguglia : mobilier de jardin et parasols
            (avant/après l&apos;été), matériel de bricolage, vélos et trottinettes, vêtements enfants,
            électroménager de cuisine et produits artisanaux corses (miel, confiture, poterie).
          </p>
          <p>
            <strong>Zone couverte :</strong> les annonces de Biguglia Connect sont visibles par tous
            les habitants de la commune et des environs — Borgo, Furiani, Lucciana, Bastia et la
            plaine de Haute-Corse. Idéal pour toucher un maximum d&apos;acheteurs potentiels à proximité.
          </p>
        </div>
        <div className="space-y-3">
          <p>
            <strong>Conseils pour sécuriser votre transaction :</strong> préférez les rencontres dans
            un lieu public (mairie de Biguglia, parking de la médiathèque, place du village). Vérifiez
            l&apos;objet avant de payer. Consultez le profil du vendeur et ses évaluations sur Biguglia Connect.
          </p>
          <p>
            <strong>Dons gratuits :</strong> de nombreux habitants préfèrent donner plutôt que jeter.
            Consultez la catégorie &quot;Dons gratuits&quot; pour récupérer des objets utiles à Biguglia et
            dans les communes voisines. Cette pratique réduit les déchets et renforce les liens de voisinage.
          </p>
          <p>
            <strong>Matériel partagé :</strong> pour du matériel dont vous n&apos;avez besoin qu&apos;une fois
            (perceuse, échelle, tondeuse…), consultez aussi la section{' '}
            <Link href="/materiel" className="text-emerald-600 font-semibold hover:underline">
              Matériel partagé
            </Link>{' '}
            — prêt gratuit entre voisins de Biguglia.
          </p>
        </div>
      </div>

      {/* Garanties */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GUARANTEES.map(g => (
          <div key={g.title} className="flex items-start gap-3 bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
            <span className="text-xl flex-shrink-0">{g.emoji}</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">{g.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs">
        {QUICK_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
