'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Eye, ChevronLeft, Search,
  FileText, ExternalLink, MessageSquare, AlertCircle,
  Shield, Clock, MapPin, Briefcase, ChevronDown, ChevronUp,
  Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ROLE_LABELS, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: 'professionnel' | 'particulier';
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  created_at: string;
  profile?: Profile & { email: string; phone?: string };
  trade_category?: { name: string; icon: string };
}

/* ─── Composant : bouton d'ouverture de document ─── */
function DocLink({ storagePath, label, icon }: { storagePath?: string; label: string; icon: string }) {
  const [loading, setLoading] = useState(false);

  const openDoc = async () => {
    if (!storagePath) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const path = storagePath.startsWith('documents/')
        ? storagePath.slice('documents/'.length)
        : storagePath;
      const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        window.open(storagePath, '_blank');
        toast('Ouverture directe — URL sécurisée non disponible', { icon: '⚠️' });
      }
    } catch {
      window.open(storagePath, '_blank');
    } finally {
      setLoading(false);
    }
  };

  if (!storagePath) return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-xs">
      <span>{icon}</span><span className="flex-1">{label}</span>
      <span className="italic text-gray-300">Non fourni</span>
    </div>
  );

  return (
    <button
      onClick={openDoc}
      disabled={loading}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs hover:bg-green-100 transition-colors disabled:opacity-60 text-left"
    >
      <span>{icon}</span>
      <span className="font-medium flex-1">{label}</span>
      {loading
        ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        : <ExternalLink className="w-3 h-3 opacity-60" />
      }
    </button>
  );
}

/* ─── Composant : carte artisan ─── */
function ArtisanCard({
  artisan, onApprove, onReject,
}: {
  artisan: ArtisanEntry;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const isPending = artisan.profile?.role === 'artisan_pending';
  const isVerified = artisan.profile?.role === 'artisan_verified';
  const docCount = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;

  /* Envoyer un message privé à l'artisan via la messagerie */
  const handleSendMessage = async () => {
    if (!artisan.user_id) return;
    setSendingMsg(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Non connecté'); return; }

      // Vérifier si une conversation admin ↔ artisan existe déjà
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = (myConvs || []).map(c => c.conversation_id);
      let convId: string | null = null;

      if (myConvIds.length > 0) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', artisan.user_id)
          .in('conversation_id', myConvIds);
        if (shared && shared.length > 0) convId = shared[0].conversation_id;
      }

      if (!convId) {
        // Créer une nouvelle conversation
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .insert({ subject: `Dossier artisan — ${artisan.profile?.full_name || artisan.business_name}`, related_type: 'general' })
          .select('id')
          .single();

        if (convErr || !conv) {
          // Essai sans related_type
          const { data: conv2 } = await supabase
            .from('conversations')
            .insert({ subject: `Dossier artisan — ${artisan.profile?.full_name || artisan.business_name}` })
            .select('id')
            .single();
          if (!conv2) { toast.error('Impossible de créer la conversation'); return; }
          convId = conv2.id;
        } else {
          convId = conv.id;
        }

        // Ajouter les participants
        await supabase.from('conversation_participants').upsert([
          { conversation_id: convId, user_id: user.id },
          { conversation_id: convId, user_id: artisan.user_id },
        ], { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
      }

      // Rediriger vers la messagerie
      window.location.href = `/messages/${convId}`;
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'ouverture de la messagerie');
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${isPending ? 'border-orange-200' : isVerified ? 'border-green-200' : 'border-gray-200'}`}>

      {/* ── En-tête résumé ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar
            src={artisan.profile?.avatar_url}
            name={artisan.profile?.full_name || artisan.business_name}
            size="lg"
          />

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-lg">
                {artisan.profile?.full_name || artisan.business_name || 'Artisan'}
              </span>
              <Badge variant={isVerified ? 'success' : isPending ? 'warning' : 'default'}>
                {ROLE_LABELS[artisan.profile?.role || 'artisan_pending']}
              </Badge>
              {docCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  📎 {docCount} doc{docCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-1">
              {/* Téléphone */}
              {artisan.profile?.phone ? (
                <span className="flex items-center gap-1 font-medium text-brand-700">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${artisan.profile.phone}`} className="hover:underline">{artisan.profile.phone}</a>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 italic text-xs">
                  <Phone className="w-3 h-3" /> Téléphone non renseigné
                </span>
              )}
              {/* Email */}
              <a href={`mailto:${artisan.profile?.email}`} className="text-brand-600 hover:underline text-xs">
                {artisan.profile?.email}
              </a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {artisan.trade_category && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {artisan.trade_category.icon} {artisan.trade_category.name}
                </span>
              )}
              {artisan.service_area && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {artisan.service_area}
                </span>
              )}
              {artisan.years_experience != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {artisan.years_experience} ans d&apos;exp.
                </span>
              )}
              {artisan.siret && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> SIRET : {artisan.siret}
                </span>
              )}
              <span className="text-gray-400">Inscrit {formatRelative(artisan.created_at)}</span>
            </div>
          </div>

          {/* Boutons d'action rapide */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Réduire' : 'Voir le dossier'}
            </button>

            {/* Bouton messagerie */}
            <button
              onClick={handleSendMessage}
              disabled={sendingMsg}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors disabled:opacity-60"
            >
              {sendingMsg
                ? <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <MessageSquare className="w-3.5 h-3.5" />
              }
              Envoyer un message
            </button>

            <Link href={`/artisans/${artisan.id}`} target="_blank">
              <Button size="sm" variant="outline" className="w-full">
                <Eye className="w-3.5 h-3.5" /> Profil public
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dossier complet dépliable ── */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">

          {/* Présentation */}
          {artisan.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Présentation</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{artisan.description}</p>
            </div>
          )}

          {/* Infos légales déclarées */}
          {(artisan.siret || artisan.insurance) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations légales</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artisan.siret && (
                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-500 text-xs">SIRET déclaré</span>
                    <div className="font-mono font-medium text-gray-900">{artisan.siret}</div>
                  </div>
                )}
                {artisan.insurance && (
                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-500 text-xs">Assurance déclarée</span>
                    <div className="font-medium text-gray-900">{artisan.insurance}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents justificatifs */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Documents justificatifs
            </h4>
            <div className="space-y-2">
              <DocLink storagePath={artisan.doc_insurance_url} label="Attestation d'assurance décennale / RC Pro" icon="🛡️" />
              <DocLink storagePath={artisan.doc_kbis_url} label="Kbis / Justificatif d'immatriculation" icon="📋" />
              <DocLink storagePath={artisan.doc_id_url} label="Pièce d'identité" icon="🪪" />
            </div>
            {docCount === 0 && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Aucun document fourni. Vous pouvez valider si vous avez vérifié l&apos;artisan par un autre moyen,
                  ou utiliser le bouton &ldquo;Envoyer un message&rdquo; pour lui demander ses documents.
                </p>
              </div>
            )}
          </div>

          {/* ── Actions de modération pour artisan en attente ── */}
          {isPending && (
            <div className="border-t border-gray-200 pt-4 space-y-4">

              {/* Checkbox obligatoire */}
              <label className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-green-600 flex-shrink-0"
                  checked={confirmedLocal}
                  onChange={e => setConfirmedLocal(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-semibold text-green-800">✅ Je confirme que cet artisan est bien de Biguglia</span>
                  <p className="text-xs text-green-600 mt-0.5">Cochez cette case pour activer le bouton d&apos;approbation</p>
                </div>
              </label>

              {!rejecting ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRejecting(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Refuser
                  </button>
                  <button
                    onClick={() => {
                      if (!confirmedLocal) {
                        toast.error('Cochez d\'abord la case "Artisan de Biguglia"');
                        return;
                      }
                      onApprove(artisan.user_id);
                    }}
                    disabled={!confirmedLocal}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" /> ✅ Approuver le profil artisan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Motif du refus <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Ce message sera envoyé à l&apos;artisan par notification.</p>
                    <div className="space-y-2 mb-3">
                      {[
                        'Documents manquants : veuillez joindre votre attestation d\'assurance en cours de validité.',
                        'Documents manquants : veuillez joindre votre Kbis ou justificatif d\'immatriculation.',
                        'Documents manquants : veuillez joindre une pièce d\'identité en cours de validité.',
                        'Les documents fournis sont illisibles ou incomplets. Veuillez les renvoyer.',
                        'Votre assurance est expirée. Veuillez fournir une attestation en cours de validité.',
                        'Activité non éligible à la plateforme Biguglia Connect.',
                      ].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReason(s)}
                          className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Ou saisissez un motif personnalisé..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRejecting(false); setReason(''); }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (!reason.trim()) { toast.error('Indiquez un motif de refus'); return; }
                        onReject(artisan.user_id, reason);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Confirmer le refus et notifier l&apos;artisan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Artisan vérifié */}
          {isVerified && (
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Profil validé et visible sur la plateforme</span>
              </div>
              <button
                onClick={() => {
                  const r = window.prompt('Motif de révocation (sera envoyé à l\'artisan) :');
                  if (r !== null) onReject(artisan.user_id, r || 'Profil suspendu par l\'administrateur.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Révoquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page principale ─── */
export default function AdminArtisansPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [artisans, setArtisans] = useState<ArtisanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    if (!isAdmin()) { router.push('/'); return; }
    fetchArtisans();
  }, [profile, isAdmin, router, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchArtisans = async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();

    // ── Étape 1 : profils selon le filtre ──
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, status, phone, created_at')
      .order('created_at', { ascending: true });

    if (filter === 'pending') profilesQuery = profilesQuery.eq('role', 'artisan_pending');
    else if (filter === 'verified') profilesQuery = profilesQuery.eq('role', 'artisan_verified');
    else profilesQuery = profilesQuery.in('role', ['artisan_pending', 'artisan_verified']);

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      setLoadError(`Erreur profils : ${profilesError.message}`);
      setLoading(false);
      return;
    }

    if (!profiles || profiles.length === 0) {
      setArtisans([]);
      setLoading(false);
      return;
    }

    // ── Étape 2 : données artisan_profiles + catégories ──
    const userIds = profiles.map(p => p.id);

    const { data: artisanData } = await supabase
      .from('artisan_profiles')
      .select('id, user_id, business_name, description, service_area, years_experience, siret, insurance, created_at, artisan_type, doc_kbis_url, doc_insurance_url, doc_id_url, rejection_reason, trade_category:trade_categories(name, icon)')
      .in('user_id', userIds);

    const artisanMap = new Map<string, typeof artisanData extends (infer T)[] | null ? T : never>();
    for (const a of (artisanData || [])) {
      artisanMap.set((a as { user_id: string }).user_id, a as typeof artisanData extends (infer T)[] | null ? T : never);
    }

    // ── Fusion ──
    const list: ArtisanEntry[] = profiles.map(prof => {
      const art = artisanMap.get(prof.id) as Record<string, unknown> | undefined;
      return {
        id: (art?.id as string) ?? prof.id,
        user_id: prof.id,
        business_name: (art?.business_name as string) ?? '',
        description: (art?.description as string) ?? '',
        service_area: (art?.service_area as string) ?? '',
        years_experience: art?.years_experience as number | undefined,
        siret: art?.siret as string | undefined,
        insurance: art?.insurance as string | undefined,
        artisan_type: art?.artisan_type as 'professionnel' | 'particulier' | undefined,
        doc_kbis_url: art?.doc_kbis_url as string | undefined,
        doc_insurance_url: art?.doc_insurance_url as string | undefined,
        doc_id_url: art?.doc_id_url as string | undefined,
        rejection_reason: art?.rejection_reason as string | undefined,
        created_at: (art?.created_at as string) ?? (prof.created_at as string) ?? '',
        trade_category: art?.trade_category as { name: string; icon: string } | undefined,
        profile: prof as ArtisanEntry['profile'],
      };
    });

    setArtisans(list);
    setLoading(false);
  };

  const approveArtisan = async (artisanUserId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ role: 'artisan_verified', status: 'active' }).eq('id', artisanUserId);
    if (error) { toast.error('Erreur lors de la validation'); return; }
    await supabase.from('notifications').insert({
      user_id: artisanUserId,
      type: 'artisan_approved',
      title: '✅ Profil artisan validé !',
      message: 'Félicitations ! Votre profil artisan a été validé. Vous êtes maintenant visible sur la plateforme Biguglia Connect.',
      link: '/dashboard/artisan',
    });
    toast.success('Artisan approuvé et notifié !');
    fetchArtisans();
  };

  const rejectArtisan = async (artisanUserId: string, reason: string) => {
    const supabase = createClient();
    await supabase.from('profiles').update({ role: 'resident', status: 'active' }).eq('id', artisanUserId);
    await supabase.from('artisan_profiles').update({ rejection_reason: reason }).eq('user_id', artisanUserId);
    await supabase.from('notifications').insert({
      user_id: artisanUserId,
      type: 'artisan_rejected',
      title: '❌ Profil artisan non validé',
      message: reason,
      link: '/inscription/artisan-profil',
    });
    toast.success('Artisan refusé et notifié');
    fetchArtisans();
  };

  const filtered = artisans.filter(a =>
    !search ||
    a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = artisans.filter(a => a.profile?.role === 'artisan_pending').length;

  if (!profile || !isAdmin()) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des artisans</h1>
          <p className="text-gray-500 text-sm">Examinez les dossiers, vérifiez les informations et validez les profils</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold">
            ⏳ {pendingCount} en attente
          </div>
        )}
      </div>

      {/* ── Erreur ── */}
      {loadError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 mb-1">Erreur de chargement</h3>
            <p className="text-sm text-red-800 font-mono bg-red-100 rounded p-2 mb-3">{loadError}</p>
            <button onClick={fetchArtisans} className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* ── Guide ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4" /> Comment valider un artisan
        </h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Cliquez sur <strong>«&nbsp;Voir le dossier&nbsp;»</strong> pour voir les détails complets</li>
          <li>Vérifiez les informations (nom, téléphone, catégorie, documents éventuels)</li>
          <li>Utilisez <strong>«&nbsp;Envoyer un message&nbsp;»</strong> pour demander des informations supplémentaires</li>
          <li>Cochez <strong>«&nbsp;Artisan de Biguglia ✓&nbsp;»</strong> puis cliquez sur <strong>«&nbsp;Approuver&nbsp;»</strong></li>
        </ol>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="sm:w-48">
          <option value="pending">En attente de validation</option>
          <option value="verified">Artisans vérifiés</option>
          <option value="all">Tous les dossiers</option>
        </Select>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-gray-700">
            {filter === 'pending' ? 'Aucun artisan en attente de validation' : 'Aucun résultat'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'pending' ? 'Toutes les demandes ont été traitées ✓' : 'Essayez un autre filtre ou une autre recherche.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(artisan => (
            <ArtisanCard
              key={artisan.id}
              artisan={artisan}
              onApprove={approveArtisan}
              onReject={rejectArtisan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
