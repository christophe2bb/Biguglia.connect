import 'server-only';
import { redirect } from 'next/navigation';
import { verifyAdminLayout } from '@/lib/supabase/admin-layout-guard';

/** L'interface et ses outils sensibles sont réservés à l'administrateur. */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await verifyAdminLayout();
  if (actor.role !== 'admin') {
    redirect('/admin');
  }
  return children;
}
