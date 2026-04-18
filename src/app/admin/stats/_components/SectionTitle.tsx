

interface Props {
  icon:   React.ElementType;
  title:  string;
  color?: string;
}

export function SectionTitle({ icon: Icon, title, color = 'text-gray-700' }: Props) {
  return (
    <h2 className={`flex items-center gap-2 text-lg font-bold mb-4 ${color}`}>
      <Icon className="w-5 h-5" /> {title}
    </h2>
  );
}
