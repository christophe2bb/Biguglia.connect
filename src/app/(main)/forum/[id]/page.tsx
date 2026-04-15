/**
 * forum/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à ForumTopicClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ForumTopicClient from './ForumTopicClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    // Try forum_topics first (v2), then forum_posts (v1)
    const { data: topicV2 } = await supabase
      .from('forum_topics')
      .select('title, content')
      .eq('id', params.id)
      .single();

    if (topicV2) {
      const title = `${topicV2.title} — Forum | Biguglia Connect`;
      const description = topicV2.content
        ? topicV2.content.slice(0, 155)
        : 'Participez à la discussion sur le forum de Biguglia Connect.';
      return { title, description, openGraph: { title, description } };
    }

    const { data: postV1 } = await supabase
      .from('forum_posts')
      .select('title, content')
      .eq('id', params.id)
      .single();

    if (postV1) {
      const title = `${postV1.title} — Forum | Biguglia Connect`;
      const description = postV1.content
        ? postV1.content.slice(0, 155)
        : 'Participez à la discussion sur le forum de Biguglia Connect.';
      return { title, description, openGraph: { title, description } };
    }

    return { title: 'Sujet introuvable — Forum | Biguglia Connect' };
  } catch {
    return { title: 'Forum — Biguglia Connect' };
  }
}

export default function ForumTopicPage() {
  return <ForumTopicClient />;
}
