'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

function ConnexionForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : `Erreur : ${error.message}`
        );
        setLoading(false);
        return;
      }

      if (!data.session) {
        toast.error('Session non créée. Réessayez.');
        setLoading(false);
        return;
      }

      // Session créée avec succès
      setSuccess(true);
      toast.success('Connexion réussie !');

      // Redirection après un court délai pour laisser les cookies s'établir
      setTimeout(() => {
        window.location.replace(redirect);
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erreur inattendue. Réessayez.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Connexion réussie !</h2>
        <p className="text-gray-500 text-sm">Redirection en cours...</p>
        <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.fr"
          leftIcon={<Mail className="w-4 h-4" />}
          required
          autoComplete="email"
          disabled={loading}
        />

        <Input
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          required
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="flex justify-end">
          <Link href="/mot-de-passe-oublie" className="text-sm text-brand-600 hover:text-brand-700">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
          {loading ? 'Vérification...' : 'Se connecter'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="text-brand-600 font-medium hover:text-brand-700">
            S&apos;inscrire gratuitement
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">B</div>
            <span className="font-bold text-xl text-gray-900">Biguglia Connect</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bon retour !</h1>
          <p className="text-gray-500">Connectez-vous à votre compte</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">Chargement...</div>}>
          <ConnexionForm />
        </Suspense>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            En vous connectant, vous acceptez nos{' '}
            <Link href="/cgu" className="underline hover:text-gray-600">CGU</Link>
            {' '}et notre{' '}
            <Link href="/confidentialite" className="underline hover:text-gray-600">politique de confidentialité</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
