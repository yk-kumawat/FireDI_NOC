import type { RequirementCategory } from "../types/checklist";

export const CATEGORY_TITLES: Record<RequirementCategory, string> = {
  COMMON: "1. Common Statutory Requirements",
  INDUSTRIAL: "2. Industrial Facility Requirements",
  EXISTING_BUILDING: "3. Existing Building Audit Requirements",
  HAZARDOUS_MATERIALS: "4. Hazardous Materials Approvals",
  BUILDING_SAFETY: "5. High-Rise Building Safety Clearances",
};