import type { ChecklistItem } from "../../types/checklist";

interface InformationRequirementsNoteProps {
  items: ChecklistItem[];
}

export const InformationRequirementsNote = ({ items }: InformationRequirementsNoteProps) => (
  <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <h4 className="text-sm font-semibold text-blue-800 mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
      Information Requirements ({items.length})
    </h4>
    <p className="text-xs text-blue-700" style={{ fontFamily: "Inter, sans-serif" }}>
      The following requirements need information entry rather than document upload. Use the checklist to provide details.
    </p>
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item.requirementId} className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
          {item.name}
        </span>
      ))}
    </div>
  </div>
);