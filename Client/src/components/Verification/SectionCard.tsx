interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export const SectionCard = ({ title, children }: SectionCardProps) => (
  <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] p-6 mb-5">
    <h2 className="text-base font-bold text-[#131b2e] mb-4 pb-3 border-b border-[#f1f5f9]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      {title}
    </h2>
    <div>{children}</div>
  </div>
);