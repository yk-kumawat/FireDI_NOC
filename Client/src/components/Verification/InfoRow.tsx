interface InfoRowProps {
  label: string;
  value?: string | number | boolean | null;
}

export const InfoRow = ({ label, value }: InfoRowProps) => {
  if (value == null || value === "" || value === undefined) return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#f8fafc] last:border-0">
      <span className="text-sm text-[#5b403d] min-w-[180px] shrink-0" style={{ fontFamily: "Inter, sans-serif" }}>{label}</span>
      <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>{display}</span>
    </div>
  );
};