import { ChevronRight } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';

export const FAQ = [
  {
    q: 'Comment déposer une annonce gratuite à Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect, cliquez sur "Nouvelle annonce", renseignez le titre, la description, le prix et ajoutez des photos. Votre annonce est immédiatement visible par tous les habitants de Biguglia et des communes voisines (Borgo, Furiani, Lucciana, Bastia).',
  },
  {
    q: "Quels types d'objets peut-on vendre ou donner à Biguglia ?",
    a: "Tout type de bien d'occasion : meubles, électroménager, vêtements, livres, jouets, vélos, matériel de bricolage, jardinage, électronique, véhicules, produits artisanaux corses (miel, confiture, poterie)… Les seules restrictions concernent les objets illégaux ou dangereux.",
  },
  {
    q: 'Comment sécuriser une transaction entre particuliers à Biguglia ?',
    a: 'Préférez les rencontres dans un lieu public du village (mairie de Biguglia, place principale, parking de la médiathèque). Vérifiez l\'objet avant de payer. Sur Biguglia Connect, chaque profil vendeur dispose d\'un score de confiance basé sur son historique de transactions et ses avis reçus.',
  },
  {
    q: "Y a-t-il des dons gratuits d'objets à Biguglia ?",
    a: 'Oui, la catégorie "Dons gratuits" est très active sur Biguglia Connect. De nombreux habitants préfèrent donner plutôt que jeter — meubles, électroménager, vêtements, jouets. Ces objets sont disponibles gratuitement pour les habitants de Biguglia et des communes voisines.',
  },
  {
    q: 'Y a-t-il un marché aux puces ou vide-grenier à Biguglia ?',
    a: 'Des vide-greniers et marchés de l\'occasion sont régulièrement organisés à Biguglia et dans les communes proches. Consultez la section Événements de Biguglia Connect pour l\'agenda des brocantes et marchés locaux. Vous pouvez aussi y publier votre propre vide-grenier.',
  },
  {
    q: 'Biguglia Connect prend-il une commission sur les ventes ?',
    a: "Non, Biguglia Connect est entièrement gratuit pour les particuliers. Déposer une annonce, contacter un vendeur et consulter les offres est 100 % gratuit. L'objectif est de faciliter les échanges de proximité entre habitants de Biguglia et du bassin de Haute-Corse.",
  },
  {
    q: 'Comment éviter les arnaques dans les petites annonces à Biguglia ?',
    a: 'Privilégiez toujours les rencontres en personne dans un lieu public (mairie de Biguglia, parking de la médiathèque, place principale). N\'envoyez jamais d\'argent à l\'avance sans avoir vu l\'objet. Méfiez-vous des prix anormalement bas. Sur Biguglia Connect, consultez l\'historique et les évaluations du vendeur avant tout achat.',
  },
  {
    q: 'Peut-on vendre des produits artisanaux corses sur Biguglia Connect ?',
    a: 'Oui, les habitants et artisans de Biguglia peuvent publier des annonces pour vendre leurs productions locales : miel du maquis, confitures, charcuterie, poteries, produits du terroir corse. Ces annonces sont particulièrement appréciées par les résidents et les visiteurs de Haute-Corse.',
  },
];

export default function AnnoncesFaq() {
  return (
    <section>
      <h2 className="text-2xl font-black text-gray-900 mb-6">
        Questions fréquentes — Annonces à {GEO.city}
      </h2>
      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <details key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group" open={i === 0}>
            <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
              <h3 className="font-bold text-gray-900 text-sm pr-4">{item.q}</h3>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
