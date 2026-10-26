interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

export const StatCard = ({ label, value, color }: StatCardProps) => {
  const colors: Record<string, { bg: string; text: string }> = {
    slate: { bg: "bg-slate-100", text: "text-slate-700" },
    green: { bg: "bg-green-100", text: "text-green-700" },
    red: { bg: "bg-red-100", text: "text-red-700" },
    amber: { bg: "bg-amber-100", text: "text-amber-700" },
    blue: { bg: "bg-blue-100", text: "text-blue-700" },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className={`p-3 rounded-lg ${c.bg}`}>
      <p className="text-2xl font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        {value}
      </p>
      <p className={`text-xs font-medium ${c.text}`} style={{ fontFamily: "Inter, sans-serif" }}>
        {label}
      </p>
    </div>
  );
};