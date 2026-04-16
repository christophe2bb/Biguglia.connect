/**
 * Page: Profil d'un membre dans une communauté thématique
 * Route: /communaute/[theme]/membre/[userId]
 *
 * Server Component — fetches minimal SEO data server-side,
 * delegates all interactive rendering to MemberProfileClient.
 */

import type { Metadata } from 'next';
import { getThemeConfig } from '../../_config';
import { fetchMemberSEO } from './queries';
import MemberProfileClient from './MemberProfileClient';

interface PageProps {
  params: Promise<{ theme: string; userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { theme, userId } = await params;
  const [member, themeConfig] = await Promise.all([
    fetchMemberSEO(userId),
    Promise.resolve(getThemeConfig(theme)),
  ]);

  if (!member) {
    return { title: 'Membre introuvable — Biguglia Connect' };
  }

  const title = `${member.full_name} — Communauté ${themeConfig.label} | Biguglia Connect`;
  const description = member.bio
    ? member.bio.slice(0, 155)
    : `Profil de ${member.full_name} dans la communauté ${themeConfig.label} de Biguglia.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://biguglia-connect.vercel.app/communaute/${theme}/membre/${userId}`,
    },
    alternates: {
      canonical: `https://biguglia-connect.vercel.app/communaute/${theme}/membre/${userId}`,
    },
  };
}

export default async function MemberProfilePage() {
  return <MemberProfileClient />;
}
