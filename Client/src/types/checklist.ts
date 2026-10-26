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

// ─── Validation Types ──────────────────────────────────────────────────────────
export type ValidationOverallStatus =
  | "passed"
  | "mismatch_found"
  | "needs_review"
  | "insufficient_data"
  | "category_mismatch"
  | "failed";

export type ValidationFindingStatus =
  | "passed"
  | "mismatch_found"
  | "needs_review"
  | "insufficient_data"
  | "not_applicable"
  | "failed"
  | "category_mismatch";

export type ComparisonMethod =
  | "exact"
  | "normalized"
  | "fuzzy_similarity"
  | "date_comparison"
  | "numeric_comparison"
  | "registration_number"
  | "address_comparison"
  | "boolean_match"
  | "not_compared";

export interface ValidationFinding {
  findingId: string;
  fieldName: string;
  description: string;
  ruleId: string;
  status: ValidationFindingStatus;
  comparisonMethod: ComparisonMethod;
  documentValue: string | number | boolean | null;
  applicationValue: string | number | boolean | null;
  normalizedDocumentValue?: string | number | boolean | null;
  normalizedApplicationValue?: string | number | boolean | null;
  explanation: string;
  confidence?: number;
  isRequired: boolean;
  metadata?: Record<string, unknown>;
}

export interface DocumentValidationResult {
  _id?: string;
  applicationId: string;
  documentId: string;
  extractionId?: string;
  classificationId?: string;
  expectedRequirementId: string;
  predictedRequirementId?: string;
  overallStatus: ValidationOverallStatus;
  findings: ValidationFinding[];
  ruleSetVersion: string;
  engineVersion: string;
  validatedAt: string;
  initiatedBy: string;
  processingErrors?: string[];
  isRevalidation: boolean;
  previousValidationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  validation?: DocumentValidationResult;
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
