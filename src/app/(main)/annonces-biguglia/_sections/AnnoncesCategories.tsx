import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';

export const CATEGORY_EDITORIAL = [
  {
    emoji: '🚗',
    title: 'Véhicules à Biguglia',
    desc:  "Voitures, motos, scooters, vélos d'occasion. Les échanges de véhicules entre particuliers à Biguglia évitent les frais de concessionnaire et permettent des transactions directes et sécurisées.",
    href:  '/annonces?categorie=vehicule',
  },
  {
    emoji: '🪑',
    title: 'Mobilier & Déco à Biguglia',
    desc:  "Meubles de salon, chambres, cuisine, jardin. Avant l'été, les habitants de Biguglia vendent souvent parasols, tables de jardin et mobilier extérieur — idéal pour les nouveaux arrivants.",
    href:  '/annonces?categorie=mobilier',
  },
  {
    emoji: '📱',
    title: 'Électronique & High-Tech à Biguglia',
    desc:  "Smartphones, ordinateurs, tablettes, consoles. Achetez de l'électronique d'occasion à prix réduit auprès de vos voisins de Biguglia, sans frais de livraison.",
    href:  '/annonces?categorie=electronique',
  },
  {
    emoji: '🏡',
    title: 'Maison & Jardin à Biguglia',
    desc:  "Outillage de bricolage, jardinage, matériaux de construction. Les habitants de Biguglia échangent régulièrement du matériel de jardinage et de bricolage — consultez aussi la section Matériel partagé.",
    href:  '/annonces?categorie=maison',
  },
  {
    emoji: '👕',
    title: 'Vêtements & Mode à Biguglia',
    desc:  "Vêtements enfants et adultes, chaussures, accessoires. Les achats d'occasion locaux sont écologiques et économiques — idéal pour les familles de Biguglia.",
    href:  '/annonces?categorie=vetement',
  },
  {
    emoji: '🎁',
    title: 'Dons gratuits à Biguglia',
    desc:  'Objets donnés gratuitement par des habitants de Biguglia, Borgo, Furiani et Lucciana. Favorisez l\'économie circulaire et récupérez des objets utiles sans dépenser.',
    href:  '/annonces?type=don',
  },
];

export default function AnnoncesCategories() {
  return (
    <section>
      <h2 className="text-2xl font-black text-gray-900 mb-2">
        Catégories d&apos;annonces à {GEO.city}
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Cliquez sur une catégorie pour voir toutes les annonces disponibles à Biguglia et alentours.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORY_EDITORIAL.map(cat => (
          <Link key={cat.href} href={cat.href}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-[color,border-color,box-shadow,transform] h-full flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{cat.emoji}</span>
                <h3 className="font-black text-gray-900 text-sm">{cat.title}</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed flex-1">{cat.desc}</p>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-auto">
                Voir les annonces <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
