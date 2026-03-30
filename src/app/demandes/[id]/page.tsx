'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  ArrowLeft, Loader2, Clock, AlertCircle, Flame, MapPin,
  Calendar, MessageSquare, Send, Wrench, CheckCircle,
  Trash2, User,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  address: string;
  status: string;
  created_at: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  resident_id: string;
  resident?: { id: string; full_name: string; avatar_url?: string } | null;
  category?: { id: string; name: string; icon: string } | null;
  photos?: { url: string }[];
};

type RequestComment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string; role?: string } | null;
};

const URGENCY_CONFIG = {
  normal:      { label: 'Normal',      color: 'text-gray-600 bg-gray-100',    icon: <Clock className="w-4 h-4" /> },
  urgent:      { label: 'Urgent',      color: 'text-orange-700 bg-orange-100', icon: <AlertCircle className="w-4 h-4" /> },
  tres_urgent: { label: 'Très urgent', color: 'text-red-700 bg-red-100',       icon: <Flame className="w-4 h-4" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'En attente de réponse', color: 'text-blue-700 bg-blue-100' },
  viewed:     { label: 'Vue',                   color: 'text-purple-700 bg-purple-100' },
  replied:    { label: 'Réponse reçue',          color: 'text-emerald-700 bg-emerald-100' },
  scheduled:  { label: 'Planifiée',              color: 'text-teal-700 bg-teal-100' },
  completed:  { label: '✅ Résolue',             color: 'text-gray-500 bg-gray-100' },
  cancelled:  { label: 'Annulée',               color: 'text-gray-400 bg-gray-100' },
};

export default function DemandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [request, setRequest]     = useState<ServiceRequest | null>(null);
  const [comments, setComments]   = useState<RequestComment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Charger la demande ──────────────────────────────────────────────────
  const fetchRequest = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        id, title, description, urgency, address, status, created_at,
        preferred_date, preferred_time, resident_id,
        resident:profiles!service_requests_resident_id_fkey(id, full_name, avatar_url),
        category:trade_categories(id, name, icon),
        photos:service_request_photos(url)
      `)
      .eq('id', id)
      .single();

    if (!error && data) setRequest(data as unknown as ServiceRequest);
    setLoading(false);
  }, [supabase, id]);

  // ── Charger les commentaires ────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('request_comments')
      .select(`
        id, content, created_at, author_id,
        author:profiles!request_comments_author_id_fkey(full_name, avatar_url, role)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true });

    setComments((data as unknown as RequestComment[]) || []);
  }, [supabase, id]);

  useEffect(() => {
    fetchRequest();
    fetchComments();
  }, [fetchRequest, fetchComments]);

  // ── Poster un commentaire ────────────────────────────────────────────────
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour répondre'); return; }
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('request_comments').insert({
      request_id: id,
      author_id: profile.id,
      content: newComment.trim(),
    });

    if (error) {
      // Table manquante → créer via migration
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('Could not find')) {
        toast.error('Table manquante — exécutez la migration dans /admin/migration');
      } else {
        toast.error(`Erreur : ${error.message}`);
      }
    } else {
      toast.success('✅ Réponse publiée !', { duration: 3000 });
      setNewComment('');
      fetchComments();
      // Marquer la demande comme "replied" si elle était submitted/viewed
      if (request && ['submitted', 'viewed'].includes(request.status) && profile.id !== request.resident_id) {
        await supabase
          .from('service_requests')
          .update({ status: 'replied' })
          .eq('id', id)
          .in('status', ['submitted', 'viewed']);
        fetchRequest();
      }
    }
    setSubmitting(false);
  };

  // ── Supprimer un commentaire ─────────────────────────────────────────────
  const handleDeleteComment = async (comment: RequestComment) => {
    if (!profile) return;
    const isOwner = profile.id === comment.author_id;
    const isAdmin = profile.role === 'admin' || profile.role === 'moderator';
    if (!isOwner && !isAdmin) return;
    if (!confirm('Supprimer ce commentaire ?')) return;

    const { error } = await supabase.from('request_comments').delete().eq('id', comment.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('Commentaire supprimé', { duration: 2000 });
      fetchComments();
    }
  };

  // ── Marquer comme résolue ─────────────────────────────────────────────────
  const handleMarkResolved = async () => {
    if (!request || !profile || profile.id !== request.resident_id) return;
    if (!confirm('Marquer cette demande comme résolue ?')) return;

    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('resident_id', profile.id);

    if (!error) {
      toast.success('✅ Demande marquée comme résolue !', { duration: 4000 });
      fetchRequest();
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-semibold">Demande introuvable.</p>
        <Link href="/demandes" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Retour aux demandes
        </Link>
      </div>
    );
  }

  const urg = URGENCY_CONFIG[request.urgency] ?? URGENCY_CONFIG.normal;
  const st  = STATUS_CONFIG[request.status]   ?? STATUS_CONFIG.submitted;
  const isOwner = profile?.id === request.resident_id;
  const isResolved = request.status === 'completed' || request.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Retour ── */}
        <Link href="/demandes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Toutes les demandes
        </Link>

        {/* ── Carte principale ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <div className="flex gap-2 p-4 pb-0 overflow-x-auto">
              {request.photos.map((p, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={p.url} alt={`photo ${i+1}`}
                  className="h-40 w-auto rounded-xl object-cover flex-shrink-0" />
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${urg.color}`}>
                {urg.icon} {urg.label}
              </span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${st.color}`}>
                {st.label}
              </span>
              {request.category && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {request.category.icon} {request.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-3">{request.title}</h1>
            <p className="text-gray-600 leading-relaxed mb-5 whitespace-pre-wrap">{request.description}</p>

            {/* Méta */}
            <div className="grid sm:grid-cols-2 gap-3 bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 mb-5">
              {request.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{request.address}</span>
                </div>
              )}
              {request.preferred_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {new Date(request.preferred_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {request.preferred_time && ` à ${request.preferred_time}`}
                  </span>
                </div>
              )}
            </div>

            {/* Auteur */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={request.resident?.avatar_url} name={request.resident?.full_name ?? 'Habitant'} size="sm" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{request.resident?.full_name ?? 'Habitant'}</p>
                  <p className="text-xs text-gray-400">{formatRelative(request.created_at)}</p>
                </div>
              </div>

              {/* Actions auteur */}
              <div className="flex gap-2">
                {isOwner && !isResolved && (
                  <button onClick={handleMarkResolved}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all">
                    <CheckCircle className="w-4 h-4" /> Marquer résolue
                  </button>
                )}
                {isOwner && (
                  <Link href={`/messages`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">
                    <MessageSquare className="w-4 h-4" /> Mes messages
                  </Link>
                )}
                {!isOwner && profile && (
                  <Link href={`/messages?to=${request.resident_id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">
                    <MessageSquare className="w-4 h-4" /> Message privé
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Fil de réponses ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-gray-900">
              {comments.length === 0
                ? 'Soyez le premier à répondre'
                : `${comments.length} réponse${comments.length > 1 ? 's' : ''}`}
            </h2>
          </div>

          {/* Liste commentaires */}
          {comments.length > 0 && (
            <div className="divide-y divide-gray-50">
              {comments.map(comment => {
                const canDelete = profile && (profile.id === comment.author_id || profile.role === 'admin' || profile.role === 'moderator');
                const isCommentOwner = profile?.id === comment.author_id;
                const isArtisan = comment.author?.role === 'artisan_verified';
                return (
                  <div key={comment.id} className="px-6 py-4 flex gap-3 group">
                    <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name ?? 'Membre'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">
                            {comment.author?.full_name ?? 'Membre'}
                          </span>
                          {isArtisan && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Wrench className="w-3 h-3" /> Artisan vérifié
                            </span>
                          )}
                          {isCommentOwner && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              <User className="w-3 h-3 inline mr-0.5" /> Vous
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{formatRelative(comment.created_at)}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulaire réponse */}
          {!isResolved && (
            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
              {profile ? (
                <form onSubmit={handleSubmitComment}>
                  <div className="flex gap-3">
                    <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Répondre, donner un conseil, proposer votre aide…"
                        rows={3}
                        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={submitting || !newComment.trim()}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                            : <><Send className="w-4 h-4" /> Publier la réponse</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">Connectez-vous pour répondre à cette demande</p>
                  <Link href="/connexion"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-all">
                    Se connecter
                  </Link>
                </div>
              )}
            </div>
          )}

          {isResolved && (
            <div className="px-6 py-5 border-t border-gray-100 text-center">
              <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Cette demande a été résolue — les commentaires sont fermés.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
