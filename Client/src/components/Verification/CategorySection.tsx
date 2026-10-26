import type { ChecklistItem, Document, RequirementCategory } from "../../types/checklist";
import { RequirementItem } from "./RequirementItem";
import { CATEGORY_TITLES } from "../../utils/categoryTitles";

interface CategorySectionProps {
  catKey: RequirementCategory;
  items: ChecklistItem[];
  documentsMap: Record<string, Document[]>;
  isApplicationDraft: boolean;
}

export const CategorySection = ({
  catKey,
  items,
  documentsMap,
  isApplicationDraft,
}: CategorySectionProps) => (
  <div key={catKey} className="space-y-3">
    <h3
      className="text-sm font-bold text-[#131b2e] flex items-center gap-2 uppercase tracking-wider text-xs text-[#475569]"
      style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      <span>{CATEGORY_TITLES[catKey]}</span>
      <span className="text-[11px] font-normal text-[#94a3b8]">
        ({items.length} {items.length === 1 ? "item" : "items"})
      </span>
    </h3>

    <div className="space-y-2.5">
      {items.map((item) => (
        <RequirementItem
          key={item.requirementId}
          item={item}
          documentsMap={documentsMap}
          isApplicationDraft={isApplicationDraft}
        />
      ))}
    </div>
  </div>
);