

import { cn } from '@/lib/utils';

interface NeedPictoProps {
  needs: string[];
  isAcceptingMembers?: boolean;
  isAcceptingVolunteers?: boolean;
  isAcceptingDonations?: boolean;
  isAcceptingPartners?: boolean;
  urgent?: boolean;
}

export default function NeedPicto({
  needs, isAcceptingMembers, isAcceptingVolunteers,
  isAcceptingDonations, isAcceptingPartners, urgent,
}: NeedPictoProps) {
  const pictos = [];
  if (isAcceptingMembers || needs.includes('Nouveaux adhérents'))
    pictos.push({ icon: '👥', label: 'Adhérents', color: 'bg-purple-50 text-purple-700 border-purple-200' });
  if (isAcceptingVolunteers || needs.includes('Bénévoles'))
    pictos.push({ icon: '🙋', label: 'Bénévoles', color: 'bg-rose-50 text-rose-700 border-rose-200' });
  if (needs.includes('Matériel'))
    pictos.push({ icon: '📦', label: 'Matériel', color: 'bg-teal-50 text-teal-700 border-teal-200' });
  if (isAcceptingPartners || needs.includes('Sponsors'))
    pictos.push({ icon: '🤝', label: 'Partenaires', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  if (isAcceptingDonations || needs.includes('Dons'))
    pictos.push({ icon: '💝', label: 'Dons', color: 'bg-red-50 text-red-700 border-red-200' });

  if (!pictos.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {urgent && (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
          🚨 Urgent
        </span>
      )}
      {pictos.map(p => (
        <span key={p.label} className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', p.color)}>
          {p.icon} {p.label}
        </span>
      ))}
    </div>
  );
}
