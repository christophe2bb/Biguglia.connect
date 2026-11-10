import 'server-only';
import { redirect } from 'next/navigation';
import { verifyAdminLayout } from '@/lib/supabase/admin-layout-guard';

/** Les conversations privées sont réservées aux administrateurs. */
export default async function PrivateMessagesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { actor } = await verifyAdminLayout();
  if (actor.role !== 'admin') {
    redirect('/admin');
  }
  return children;
}
