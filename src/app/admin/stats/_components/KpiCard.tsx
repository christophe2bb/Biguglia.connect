

interface Props {
  icon:   React.ElementType;
  label:  string;
  value:  number | string;
  sub?:   string;
  color:  string;
  bg:     string;
}

export function KpiCard({ icon: Icon, label, value, sub, color, bg }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
