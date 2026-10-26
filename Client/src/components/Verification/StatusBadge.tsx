import { getStatusConfig } from "../../utils/verificationUtils";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{config.label}</span>
    </span>
  );
};

export const ReviewStatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    NOT_REVIEWED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Reviewed" },
    IN_REVIEW: { bg: "bg-blue-100", text: "text-blue-700", label: "In Review" },
    REVIEWED: { bg: "bg-green-100", text: "text-green-700", label: "Reviewed" },
    FLAGGED_FOR_CORRECTION: { bg: "bg-amber-100", text: "text-amber-700", label: "Flagged for Correction" },
  };
  const config = configs[status] || configs.NOT_REVIEWED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.bg} ${config.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{config.label}</span>
    </span>
  );
};