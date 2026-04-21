import type { Metadata } from 'next';
import NotificationsLoader from './NotificationsLoader';

export const metadata: Metadata = {
  title: 'Notifications | Biguglia Connect',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsLoader />;
}
