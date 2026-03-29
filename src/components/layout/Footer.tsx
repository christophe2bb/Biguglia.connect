import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { MapPin, Mail, Phone, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Décoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-ocean-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand — 2 colonnes */}
          <div className="lg:col-span-2">
            {/* Logo blanc */}
            <div className="mb-5">
              <svg
                width={40}
                height={40}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block mr-3"
              >
                <defs>
                  <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#footerGrad)" />
                <path d="M24 10 L38 22 L38 38 L10 38 L10 22 Z" fill="white" fillOpacity="0.95" />
                <path d="M24 8 L40 21 L8 21 Z" fill="white" fillOpacity="0.3" />
                <rect x="20" y="28" width="8" height="10" rx="2" fill="#f97316" />
                <rect x="12" y="25" width="6" height="5" rx="1" fill="#38bdf8" />
                <rect x="30" y="25" width="6" height="5" rx="1" fill="#38bdf8" />
              </svg>
              <span className="text-xl font-bold">
                <span className="text-brand-400">Biguglia</span>
                <span className="text-white"> Connect</span>
              </span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              La plateforme locale qui connecte les habitants et les artisans de Biguglia, en Haute-Corse. Simple, gratuit et de confiance.
            </p>

            {/* Coordonnées */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>Biguglia, Haute-Corse (20620)</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>contact@biguglia-connect.fr</span>
              </div>
            </div>

            {/* Emojis Corse */}
            <div className="mt-6 flex gap-3">
              {['🌿', '🌊', '🏝️', '☀️', '🦅'].map(emoji => (
                <span key={emoji} className="text-xl" title="Corse">{emoji}</span>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">Services</h3>
            <ul className="space-y-3">
              {[
                { href: '/artisans', label: 'Trouver un artisan', icon: '🔧' },
                { href: '/annonces', label: 'Petites annonces', icon: '📋' },
                { href: '/materiel', label: 'Prêt de matériel', icon: '🛠️' },
                { href: '/forum', label: 'Forum communauté', icon: '💬' },
              ].map(({ href, label, icon }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-400 transition-colors group">
                    <span className="group-hover:scale-110 transition-transform">{icon}</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compte */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">Mon compte</h3>
            <ul className="space-y-3">
              {[
                { href: '/inscription', label: 'S\'inscrire gratuitement' },
                { href: '/connexion', label: 'Se connecter' },
                { href: '/inscription?role=artisan', label: 'Rejoindre en artisan' },
                { href: '/dashboard', label: 'Tableau de bord' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-brand-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">Informations</h3>
            <ul className="space-y-3">
              {[
                { href: '/confiance', label: 'Confiance & Sécurité' },
                { href: '/aide', label: 'Aide & FAQ' },
                { href: '/confidentialite', label: 'Confidentialité' },
                { href: '/cgu', label: 'CGU' },
                { href: '/mentions-legales', label: 'Mentions légales' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-brand-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bas du footer */}
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Biguglia Connect. Tous droits réservés.
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Fait avec <Heart className="w-3 h-3 text-brand-500 fill-brand-500" /> en Corse 🌿
          </p>
          <p className="text-xs text-gray-600">
            Plateforme de mise en relation — ne garantit pas les travaux effectués par les artisans.
          </p>
        </div>
      </div>
    </footer>
  );
}
