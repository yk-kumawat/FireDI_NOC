export type ChecklistItemStatus = "PENDING" | "COMPLETED";
export type ChecklistStatus = "PENDING" | "COMPLETED";

export type RequirementType = "DOCUMENT" | "INFORMATION";

export type RequirementCategory =
  | "COMMON"
  | "INDUSTRIAL"
  | "EXISTING_BUILDING"
  | "HAZARDOUS_MATERIALS"
  | "BUILDING_SAFETY";

export type DocumentProcessingStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type DocumentVerificationStatus = "NOT_STARTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED";

export type TextExtractionStatus = "NOT_STARTED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
export type TextExtractionMethod = "EMBEDDED" | "OCR" | "MIXED";

export type DocumentClassificationStatus = "NOT_STARTED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ExtractedField {
  name: string;
  value: string | number | null;
  confidence?: number;
  missing: boolean;
}

export interface DocumentClassification {
  status: DocumentClassificationStatus;
  expectedRequirementId?: string;
  predictedRequirementId?: string;
  predictedRequirementName?: string;
  confidence: number;
  explanation: string;
  matchesExpected: boolean;
  extractedFields: ExtractedField[];
  missingFields: string[];
  processingError?: string;
  processingErrorCategory?: string;
  startedAt?: string;
  completedAt?: string;
  modelUsed?: string;
}

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

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  method: TextExtractionMethod;
  confidence?: number;
  error?: string;
}

export interface TextExtractionResult {
  status: TextExtractionStatus;
  method: TextExtractionMethod;
  pages: ExtractedPage[];
  totalPages: number;
  processedPages: number;
  language: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  errorCategory?: string;
  textSize: number;
}

export interface Document {
  _id: string;
  requirementId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  version: number;
  processingStatus: DocumentProcessingStatus;
  verificationStatus: DocumentVerificationStatus;
  uploadedAt: string;
  createdAt: string;
  extraction?: TextExtractionResult;
  classification?: DocumentClassification;
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
  documents?: Document[];
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
