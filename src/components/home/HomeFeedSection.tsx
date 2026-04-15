/**
 * HomeFeedSection — composant async Server Component
 * Charge le feed local (getHomeFeed) de manière isolée
 * pour ne pas bloquer le rendu du reste de la page.
 * Utilisé avec <Suspense> dans page.tsx.
 */
import { getHomeFeed } from '@/services/home/feed';
import HomeHero from './HomeHero';
import HomeSection from './HomeSection';

interface Props {
  userId: string | null;
}

export default async function HomeFeedSection({ userId }: Props) {
  let feedResult;
  try {
    feedResult = await getHomeFeed(userId);
  } catch {
    feedResult = {
      sections: [],
      totalItems: 0,
      generatedAt: new Date().toISOString(),
      hasContent: false,
    };
  }

  const { sections, totalItems, generatedAt } = feedResult;

  return (
    <>
      <HomeHero totalItems={totalItems} generatedAt={generatedAt} />
      {sections.filter(s => !s.isEmpty).map(section => (
        <HomeSection key={section.id} section={section} />
      ))}
    </>
  );
}
