import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Aide & FAQ' };

const faq = [
  {
    q: "Comment trouver un artisan à Biguglia ?",
    a: "Rendez-vous sur la section 'Artisans', filtrez par catégorie de métier et parcourez les profils vérifiés. Vous pouvez ensuite envoyer une demande avec photos directement depuis le profil de l'artisan."
  },
  {
    q: "Comment fonctionne la validation des artisans ?",
    a: "Chaque artisan qui s'inscrit doit attendre la validation manuelle de l'administrateur. Son profil n'est pas visible tant qu'il n'est pas approuvé. Vous pouvez faire confiance aux badges 'Vérifié'."
  },
  {
    q: "Mes messages sont-ils confidentiels ?",
    a: "Oui, totalement. Vos conversations ne sont accessibles qu'aux participants. Ni les autres utilisateurs ni l'administrateur ne peuvent lire vos messages privés, sauf en cas de signalement explicite."
  },
  {
    q: "Comment signaler un contenu inapproprié ?",
    a: "Utilisez le bouton 'Signaler' disponible sur les annonces, posts de forum et profils. L'équipe de modération traite les signalements dans les plus brefs délais."
  },
  {
    q: "Comment emprunter du matériel ?",
    a: "Parcourez la section 'Matériel', trouvez l'objet qui vous intéresse, et envoyez une demande d'emprunt avec vos dates. Le propriétaire recevra votre demande et vous contactera par messagerie."
  },
  {
    q: "Puis-je supprimer mon compte ?",
    a: "Oui, depuis vos paramètres de profil, vous pouvez demander la suppression de votre compte. Toutes vos données seront anonymisées ou supprimées conformément au RGPD."
  },
  {
    q: "Comment fonctionne le forum ?",
    a: "Le forum est ouvert à tous les utilisateurs inscrits. Vous pouvez créer des sujets dans les catégories disponibles et commenter les discussions des autres. La modération est assurée par l'administrateur."
  },
  {
    q: "La plateforme garantit-elle les travaux des artisans ?",
    a: "Non. Biguglia Connect est une plateforme de mise en relation. Elle facilite le contact mais n'est pas responsable de la qualité des travaux ou des transactions. Nous vous encourageons à vérifier les avis et à demander un devis écrit."
  },
];

export default function AidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="text-4xl mb-4">❓</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Aide & FAQ</h1>
        <p className="text-gray-500">Les réponses aux questions les plus fréquentes</p>
      </div>

      <div className="space-y-4 mb-12">
        {faq.map((item, i) => (
          <details key={i} className="bg-white rounded-2xl border border-gray-100 group">
            <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-gray-900 hover:text-brand-600 transition-colors">
              {item.q}
              <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200 ml-4 flex-shrink-0">▼</span>
            </summary>
            <div className="px-5 pb-5 text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
              {item.a}
            </div>
          </details>
        ))}
      </div>

      <div className="bg-brand-50 rounded-2xl p-6 text-center">
        <p className="text-brand-800 font-medium mb-2">Vous n&apos;avez pas trouvé votre réponse ?</p>
        <p className="text-brand-600 text-sm mb-4">Contactez l&apos;administrateur par email ou via le forum.</p>
        <Link href="/forum" className="inline-flex items-center justify-center bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors">
          Poser une question sur le forum
        </Link>
      </div>
    </div>
  );
}
