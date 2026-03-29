'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

function InscriptionForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'artisan' ? 'artisan_pending' : 'resident';

  const [role, setRole] = useState<'resident' | 'artisan_pending'>(initialRole as 'resident' | 'artisan_pending');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consent) {
      toast.error('Vous devez accepter les CGU et la politique de confidentialité.');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role,
          legal_consent: true,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(
        error.message === 'User already registered'
          ? 'Un compte existe déjà avec cet email.'
          : `Erreur : ${error.message}`
      );
      setLoading(false);
      return;
    }

    if (role === 'artisan_pending') {
      toast.success(
        'Compte créé ! Votre inscription en tant qu\'artisan est en attente de validation par l\'administrateur.',
        { duration: 6000 }
      );
      router.push('/inscription/artisan-profil');
    } else {
      toast.success('Compte créé ! Vérifiez votre email pour confirmer votre inscription.', { duration: 5000 });
      router.push('/inscription/confirmation');
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              B
            </div>
            <span className="font-bold text-xl text-gray-900">Biguglia Connect</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h1>
          <p className="text-gray-500">Rejoignez la communauté de Biguglia</p>
        </div>

        {/* Choix du rôle */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('resident')}
            className={cn(
              'p-4 rounded-2xl border-2 text-center transition-all duration-200',
              role === 'resident'
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            )}
          >
            <div className="text-2xl mb-1">🏘️</div>
            <div className="font-semibold text-sm">Habitant</div>
            <div className="text-xs text-gray-500 mt-0.5">Je cherche un artisan</div>
          </button>

          <button
            type="button"
            onClick={() => setRole('artisan_pending')}
            className={cn(
              'p-4 rounded-2xl border-2 text-center transition-all duration-200',
              role === 'artisan_pending'
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            )}
          >
            <div className="text-2xl mb-1">🔨</div>
            <div className="font-semibold text-sm">Artisan</div>
            <div className="text-xs text-gray-500 mt-0.5">Je propose mes services</div>
          </button>
        </div>

        {role === 'artisan_pending' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-orange-700">
              <strong>⚠️ Validation requise :</strong> Les profils artisans sont vérifiés et validés manuellement par l&apos;administrateur avant d&apos;être publiés.
            </p>
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSignUp} className="space-y-5">
            <Input
              label="Nom complet"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jean Dupont"
              leftIcon={<User className="w-4 h-4" />}
              required
              autoComplete="name"
            />

            <Input
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <Input
              label="Téléphone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              leftIcon={<Phone className="w-4 h-4" />}
              autoComplete="tel"
            />

            <Input
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              hint="Minimum 8 caractères"
              required
              autoComplete="new-password"
            />

            {/* Consentement */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                J&apos;accepte les{' '}
                <Link href="/cgu" target="_blank" className="text-brand-600 hover:underline">
                  Conditions d&apos;utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/confidentialite" target="_blank" className="text-brand-600 hover:underline">
                  Politique de confidentialité
                </Link>
                . Mes données sont protégées conformément au RGPD.
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {role === 'artisan_pending' ? 'Créer mon compte artisan' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link href="/connexion" className="text-brand-600 font-medium hover:text-brand-700">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-hero flex items-center justify-center"><div className="text-gray-400">Chargement...</div></div>}>
      <InscriptionForm />
    </Suspense>
  );
}
