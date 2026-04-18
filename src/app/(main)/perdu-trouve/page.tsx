/**
 * Route /perdu-trouve — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import PerduTrouvePageClient from './_page.client';
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
  collectionPageSchema,
  itemListSchema,
  howToSchema,
} from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Objets Perdus & Trouvés à Biguglia — Signalez & Retrouvez',
  description:
    'Signalez un objet perdu ou retrouvé à Biguglia. La plateforme de la communauté pour retrouver clés, animaux, portefeuilles et tout autre objet égaré dans le village.',
  keywords: [
    'objet perdu Biguglia', 'objet trouvé Biguglia', 'perdu trouvé Corse',
    'animal perdu Biguglia', 'clés perdues Biguglia',
    'chat perdu Biguglia', 'chien perdu Haute-Corse', 'portefeuille perdu Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/perdu-trouve` },
  openGraph: {
    title:       'Objets Perdus & Trouvés à Biguglia',
    description: 'Signalez ou retrouvez un objet perdu à Biguglia. Clés, animaux, objets égarés dans le village.',
    url:         `${SITE_URL}/perdu-trouve`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Perdu-Trouvé Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Objets Perdus & Trouvés à Biguglia',
    description: 'Retrouvez ou signalez des objets perdus à Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function PerduTrouvePage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                  url: '/' },
    { name: 'Perdu & Trouvé Biguglia', url: '/perdu-trouve' },
  ]);

  const collection = collectionPageSchema({
    name:        'Objets Perdus & Trouvés à Biguglia',
    description: 'Plateforme communautaire pour signaler et retrouver des objets perdus ou trouvés dans le village de Biguglia.',
    url:         '/perdu-trouve',
  });

  // Catégories d'objets perdus/trouvés
  const categoriesItemList = itemListSchema({
    name:  'Catégories d\'objets perdus ou trouvés à Biguglia',
    url:   '/perdu-trouve',
    items: [
      { name: 'Animaux perdus à Biguglia',       url: '/perdu-trouve', description: 'Chats, chiens et animaux de compagnie perdus ou trouvés à Biguglia et Haute-Corse' },
      { name: 'Clés perdues à Biguglia',         url: '/perdu-trouve', description: 'Signaler ou retrouver des clés perdues dans le village de Biguglia' },
      { name: 'Portefeuille perdu à Biguglia',   url: '/perdu-trouve', description: 'Portefeuilles, sacs et documents perdus à Biguglia' },
      { name: 'Téléphone perdu à Biguglia',      url: '/perdu-trouve', description: 'Smartphones et téléphones perdus ou trouvés à Biguglia' },
      { name: 'Bijoux perdus à Biguglia',        url: '/perdu-trouve', description: 'Bijoux, montres et accessoires perdus dans le village' },
      { name: 'Documents perdus à Biguglia',     url: '/perdu-trouve', description: 'Pièces d\'identité, permis de conduire et documents officiels perdus à Biguglia' },
    ],
  });

  // Guide HowTo — signaler un objet
  const howToSignaler = howToSchema({
    name:        'Comment signaler un objet perdu ou trouvé à Biguglia',
    description: 'Guide pour signaler rapidement un objet perdu ou trouvé dans le village de Biguglia.',
    url:         '/perdu-trouve',
    totalTime:   'PT3M',
    steps: [
      { name: 'Créer un compte',         text: 'Inscrivez-vous gratuitement sur Biguglia Connect si vous n\'avez pas encore de compte.' },
      { name: 'Publier le signalement',  text: 'Cliquez sur "Signaler un objet" et choisissez "Perdu" ou "Trouvé". Décrivez l\'objet, le lieu et la date.' },
      { name: 'Ajouter une photo',       text: 'Ajoutez une photo si vous l\'avez : cela multiplies par 3 les chances de retrouver l\'objet.' },
      { name: 'Être alerté',             text: 'Activez les notifications pour être alerté dès qu\'un signalement similaire est publié dans votre secteur.' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Comment signaler un objet perdu à Biguglia ?',
      a: 'Sur Biguglia Connect, cliquez sur "Signaler un objet perdu", remplissez le formulaire avec la description, le lieu et la date. Une photo augmente considérablement les chances de retrouver l\'objet. Le signalement est visible par toute la communauté.',
    },
    {
      q: 'J\'ai trouvé un objet à Biguglia, que faire ?',
      a: 'Publiez un signalement "Objet trouvé" sur Biguglia Connect avec une description (sans révéler tous les détails pour identifier le vrai propriétaire). Vous pouvez aussi le déposer à la mairie de Biguglia.',
    },
    {
      q: 'Comment retrouver un animal perdu à Biguglia ?',
      a: 'Publiez immédiatement un signalement sur Biguglia Connect avec une photo et la description de votre animal. La communauté locale sera alertée. Pensez aussi à contacter la mairie, la fourrière et les vétérinaires de Biguglia.',
    },
    {
      q: 'Les signalements perdu-trouvé sont-ils gratuits sur Biguglia Connect ?',
      a: 'Oui, signaler un objet perdu ou trouvé est entièrement gratuit sur Biguglia Connect. La plateforme est un service communautaire au bénéfice de tous les habitants de Biguglia.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={howToSignaler} />
      <JsonLd data={faq} />
      <PerduTrouvePageClient />
    </>
  );
}
