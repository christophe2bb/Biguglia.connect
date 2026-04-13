import Link from 'next/link';
import { Phone, Mail, Globe, ExternalLink, Users } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import type { Association } from '../_types';

type Props = {
  asso: Association;
  isAuthor: boolean;
  userId: string | undefined;
  isLoggedIn: boolean;
};

export function ContactSidebar({ asso, isAuthor, userId, isLoggedIn }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-violet-500" /> Contact
      </h3>

      <div className="space-y-3">
        {/* Responsible */}
        <div>
          <p className="text-xs font-bold text-gray-500">Responsable</p>
          <p className="text-sm font-semibold text-gray-800">{asso.contact_name}</p>
          {asso.contact_role && <p className="text-xs text-gray-400">{asso.contact_role}</p>}
        </div>

        {/* Phone */}
        {asso.show_phone && asso.contact_phone && (
          <a
            href={`tel:${asso.contact_phone}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{asso.contact_phone}</span>
          </a>
        )}

        {/* Email */}
        {asso.contact_email && (
          <a
            href={`mailto:${asso.contact_email}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{asso.contact_email}</span>
          </a>
        )}

        {/* Website */}
        {asso.contact_website && (
          <a
            href={asso.contact_website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Site web</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        )}

        {/* Facebook */}
        {asso.contact_facebook && (
          <a
            href={asso.contact_facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline font-semibold"
          >
            Facebook →
          </a>
        )}

        {/* Instagram */}
        {asso.contact_instagram && (
          <a
            href={asso.contact_instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-pink-600 hover:underline font-semibold"
          >
            Instagram →
          </a>
        )}
      </div>

      {/* CTA */}
      {!isAuthor && isLoggedIn && userId && (
        <div className="mt-4">
          <ContactButton
            sourceType="association"
            sourceId={asso.id}
            sourceTitle={asso.name}
            ownerId={asso.author_id}
            userId={userId}
            size="sm"
            ctaLabel="✉️ Envoyer un message"
          />
        </div>
      )}
      {!isLoggedIn && (
        <Link
          href="/connexion"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-violet-600 transition-all"
        >
          Se connecter pour contacter
        </Link>
      )}
    </div>
  );
}
