'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Save, LogOut, Trash2, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { ROLE_LABELS } from '@/lib/utils';

function ProfilContent() {
  const { profile, setProfile } = useAuthStore();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo trop lourde (max 5MB)');
      return;
    }

    setUploadingPhoto(true);
    const supabase = createClient();

    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error('Erreur upload photo');
      setUploadingPhoto(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) toast.error('Erreur sauvegarde photo');
    else {
      setProfile(data as typeof profile);
      toast.success('Photo mise à jour !');
    }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id).select().single();
    if (error) toast.error('Erreur lors de la sauvegarde');
    else { setProfile(data as typeof profile); toast.success('Profil mis à jour !'); }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon profil</h1>
      <div className="space-y-6">

        {/* Avatar + infos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Photo avec bouton upload */}
            <div className="relative">
              <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white hover:bg-brand-700 transition-colors shadow-md"
                title="Changer la photo"
              >
                {uploadingPhoto
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-lg">{profile.full_name || 'Sans nom'}</div>
              <div className="text-gray-500 text-sm">{profile.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={
                  profile.role === 'artisan_verified' ? 'success' :
                  profile.role === 'artisan_pending' ? 'warning' :
                  profile.role === 'admin' ? 'purple' : 'default'
                }>
                  {ROLE_LABELS[profile.role]}
                </Badge>
                {profile.status === 'suspended' && <Badge variant="danger">Suspendu</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-1">Cliquez sur l&apos;icône 📷 pour changer la photo</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              placeholder="Votre nom complet"
            />
            <Input
              label="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              placeholder="06 12 34 56 78"
              type="tel"
            />
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{profile.email}</span>
              <span className="text-xs text-gray-400 ml-auto">Non modifiable</span>
            </div>
          </div>

          <Button className="mt-4" onClick={handleSave} loading={loading}>
            <Save className="w-4 h-4" /> Enregistrer les modifications
          </Button>
        </div>

        {/* Consentement légal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-900 mb-3">Consentement légal</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className={profile.legal_consent ? 'text-green-600' : 'text-red-500'}>
              {profile.legal_consent ? '✓' : '✗'}
            </span>
            <span className="text-gray-600">
              CGU et politique de confidentialité acceptées
              {profile.legal_consent_at ? ` le ${new Date(profile.legal_consent_at).toLocaleDateString('fr-FR')}` : ''}
            </span>
          </div>
        </div>

        {/* Actions compte */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Actions du compte</h3>
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-gray-400" /> Se déconnecter
            </button>
            <button
              onClick={() => toast('Contactez admin@biguglia-connect.fr pour supprimer votre compte (RGPD)')}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4" /> Supprimer mon compte (RGPD)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ProfilPage() {
  return <ProtectedPage><ProfilContent /></ProtectedPage>;
}
