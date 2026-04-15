import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | Biguglia Connect',
  robots: { index: false, follow: false },
};

// Lazy-load the heavy notifications client (555 lines, Supabase realtime)
const NotificationsClient = dynamic(
  () => import('./NotificationsClient'),
  {
    loading: () => (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />)}
        </div>
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    ),
    ssr: false,
  }
);

export default function NotificationsPage() {
  return <NotificationsClient />;
}
