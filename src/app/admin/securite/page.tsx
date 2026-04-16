'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Shield, ChevronLeft, Info, Globe, ExternalLink,
} from 'lucide-react';

// Lazy-load the interactive guide (all state, all step data)
const SecuriteGuide = dynamic(() => import('./_components/SecuriteGuide'), {
  loading: () => (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  ),
});

export default function SecuritePage() {
  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Retour ── */}
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour Admin
        </Link>

        {/* ── En-tête ── */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-orange-100 rounded-2xl">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Protection Cloudflare</h1>
            <p className="text-gray-500 text-sm">Guide pas à pas — WAF, anti-DDoS, anti-bot</p>
          </div>
        </div>

        {/* ── Bannière info ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-800 text-sm">Cloudflare gratuit suffit pour Biguglia Connect</p>
              <p className="text-blue-700 text-xs mt-1">
                Le plan Free inclut : protection DDoS illimitée, WAF basique, Bot Fight Mode, SSL automatique,
                CDN mondial. Pas besoin de payer.
              </p>
            </div>
          </div>
        </div>

        {/* ── Guide interactif (lazy) ── */}
        <SecuriteGuide />

        {/* ── Liens utiles ── */}
        <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Liens utiles
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Tableau de bord Cloudflare', url: 'https://dash.cloudflare.com' },
              { label: 'Vérifier la propagation DNS', url: 'https://www.whatsmydns.net/#NS/biguglia-connect.fr' },
              { label: 'WHOIS — trouver ton registrar', url: 'https://www.whois.com/whois/biguglia-connect.fr' },
              { label: 'Tester tes headers de sécurité', url: 'https://securityheaders.com/?q=biguglia-connect.fr' },
              { label: 'Score sécurité SSL', url: 'https://www.ssllabs.com/ssltest/analyze.html?d=biguglia-connect.fr' },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                {link.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
