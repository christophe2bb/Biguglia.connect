/**
 * forum/[id] — Server Component (server-first)
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Fetch serveur : sujet, réponses, photos
 * • Délègue les interactions à ForumTopicClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ForumTopicClient from './ForumTopicClient';
import type { TopicExtended, TopicPhoto, InitialTopicData } from './_types';
import type { ForumTopic, ForumReply } from '@/types';
import { JsonLd, breadcrumbSchema, articleSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: { id: string } };

// ─── Server fetch helper ────────────────────────────────────────────────────
async function fetchTopicData(id: string): Promise<InitialTopicData | null> {
  try {
    const supabase = createClient();

    // Try v2 forum_topics first
    const { data: topicV2 } = await supabase
      .from('forum_topics')
      .select('*, sector:forum_sectors(id, name, slug, icon, color), category:forum_categories(id, name, icon, slug)')
      .eq('id', id)
      .single();

    let topicData: TopicExtended | null = null;
    let isV2 = false;

    if (topicV2) {
      isV2 = true;
      topicData = topicV2 as unknown as TopicExtended;
    } else {
      const { data: postData } = await supabase
        .from('forum_posts')
        .select('*, category:forum_categories(*)')
        .eq('id', id)
        .single();

      if (!postData) return null;

      topicData = {
        ...postData,
        status: postData.is_closed ? 'verrouille' : 'ouvert',
        reply_count: 0, reaction_count: 0, last_reply_at: null,
        is_hot: false, sector_id: null, sector: null, visibility: 'public', tags: [],
      } as unknown as TopicExtended;
    }

    // Auteur via public_profiles
    if (topicData?.author_id) {
      const { data: authorData } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', topicData.author_id)
        .single();
      if (authorData) {
        topicData = { ...topicData, author: authorData as ForumTopic['author'] };
      }
    }

    // Réponses
    const repliesTable = isV2 ? 'forum_replies' : 'forum_comments';
    const topicField   = isV2 ? 'topic_id' : 'post_id';
    const { data: repliesRaw } = await supabase
      .from(repliesTable)
      .select('*')
      .eq(topicField, id)
      .order('created_at', { ascending: true });

    const profileCache: Record<string, unknown> = {};
    const enriched: ForumReply[] = [];

    for (const r of (repliesRaw || []) as Record<string, unknown>[]) {
      const authorId = r.author_id as string | undefined;
      if (authorId && !profileCache[authorId]) {
        const { data: cp } = await supabase
          .from('public_profiles').select('id, full_name, avatar_url, role').eq('id', authorId).single();
        if (cp) profileCache[authorId] = cp;
      }
      let quotedReplyData = null;
      const quoteReplyId = r.quote_reply_id as string | undefined;
      if (isV2 && quoteReplyId) {
        const { data: qr } = await supabase
          .from('forum_replies').select('id, content, author_id').eq('id', quoteReplyId).single();
        if (qr) {
          const qAuthorId = (qr as { author_id?: string }).author_id;
          const qAuthor = qAuthorId ? profileCache[qAuthorId] || null : null;
          quotedReplyData = { ...qr, author: qAuthor };
        }
      }
      enriched.push({
        ...r,
        author: authorId ? profileCache[authorId] : undefined,
        quoted_reply: quotedReplyData,
        topic_id: (r.post_id || r.topic_id) as string,
        is_solution: (r.is_solution as boolean) || false,
        reaction_count: (r.reaction_count as number) || 0,
        quote_reply_id: quoteReplyId || null,
      } as ForumReply);
    }

    // Photos (table optionnelle)
    let topicPhotos: TopicPhoto[] = [];
    try {
      const { data: photoData } = await supabase
        .from('forum_topic_photos')
        .select('url, display_order')
        .eq('topic_id', id)
        .order('display_order');
      topicPhotos = photoData || [];
    } catch { /* Table optionnelle */ }

    return { topic: topicData, replies: enriched, topicPhotos, isV2 };
  } catch {
    return null;
  }
}

// ─── generateMetadata ───────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();

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

// ─── Page ───────────────────────────────────────────────────────────────────
export default async function ForumTopicPage({ params }: Props) {
  const initialData = await fetchTopicData(params.id);

  if (!initialData) notFound();

  const topic = initialData.topic;

  // ── Structured data ──────────────────────────────────────────────────────
  const topicTitle  = (topic as { title?: string }).title ?? 'Discussion';
  const topicContent = (topic as { content?: string }).content ?? '';
  const topicDate    = (topic as { created_at?: string }).created_at ?? new Date().toISOString();
  const topicAuthor  = (topic as { author?: { full_name?: string } }).author?.full_name ?? undefined;

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',         url: '/' },
    { name: 'Forum Biguglia', url: '/forum' },
    { name: topicTitle,       url: `/forum/${params.id}` },
  ]);

  const articleLd = articleSchema({
    headline:     topicTitle,
    description:  topicContent.slice(0, 200) || `Discussion sur le forum de Biguglia Connect.`,
    url:          `/forum/${params.id}`,
    datePublished: topicDate,
    author:       topicAuthor,
    articleBody:  topicContent,
  });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={articleLd} />
      <ForumTopicClient initialData={initialData} />
    </>
  );
}
