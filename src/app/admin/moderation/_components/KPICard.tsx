interface KPICardProps {
  label: string;
  value: number | string;
  emoji: string;
  color: string;
  subtext?: string;
  highlight?: boolean;
}

export default function KPICard({ label, value, emoji, color, subtext, highlight }: KPICardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
          {subtext && <p className="text-[10px] text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        <span className="text-2xl opacity-80">{emoji}</span>
      </div>
    </div>
  );
}
