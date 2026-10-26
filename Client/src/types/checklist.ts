export type ChecklistItemStatus = "PENDING" | "COMPLETED";
export type ChecklistStatus = "PENDING" | "COMPLETED";

export type RequirementType = "DOCUMENT" | "INFORMATION";

export type RequirementCategory =
  | "COMMON"
  | "INDUSTRIAL"
  | "EXISTING_BUILDING"
  | "HAZARDOUS_MATERIALS"
  | "BUILDING_SAFETY";

export interface RawMaterialItem {
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
}

export interface FinishedGoodsItem {
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
}

export interface ChecklistItemResponse {
  materials?: RawMaterialItem[];
  goods?: FinishedGoodsItem[];
  notes?: string;
}

export interface ChecklistItem {
  requirementId: string;
  name: string;
  description: string;
  category: RequirementCategory;
  type: RequirementType;
  required: boolean;
  status: ChecklistItemStatus;
  ruleReferences: string[];
  applicableReason: string;
  sourceReference: string;
  response?: ChecklistItemResponse;
  completedAt?: string;
}

export interface Checklist {
  _id: string;
  applicationId: string;
  applicantId: string;
  ruleSetVersion: string;
  status: ChecklistStatus;
  items: ChecklistItem[];
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}
