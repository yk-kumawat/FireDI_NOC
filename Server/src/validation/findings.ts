import { TextExtractionMethod, DocumentClassificationStatus } from "../models/Document.js";

/**
 * Validation Finding Statuses
 * - passed: Field values match (exact or normalized)
 * - mismatch_found: Field values differ in a meaningful way
 * - needs_review: Comparison is ambiguous (e.g., similar addresses, names) - human review required
 * - insufficient_data: Cannot compare because one or both values are missing
 * - not_applicable: This validation rule does not apply to this document/application combination
 * - failed: Validation rule execution failed (error)
 * - category_mismatch: Document category doesn't match expected requirement
 */
export type ValidationFindingStatus =
  | "passed"
  | "mismatch_found"
  | "needs_review"
  | "insufficient_data"
  | "not_applicable"
  | "failed"
  | "category_mismatch";

/**
 * Comparison method used for the finding
 */
export type ComparisonMethod =
  | "exact"              // Exact string/value match
  | "normalized"         // Match after normalization (whitespace, case, etc.)
  | "fuzzy_similarity"   // Similar but not identical (flagged for review)
  | "date_comparison"    // Date format normalized and compared
  | "numeric_comparison" // Numeric values compared with unit awareness
  | "registration_number"// Specialized registration number comparison
  | "address_comparison" // Address components compared
  | "boolean_match"      // Boolean values compared
  | "not_compared";      // Not compared (missing, N/A, etc.)

/**
 * Individual field-level validation finding
 */
export interface IValidationFinding {
  /** Unique identifier for this finding */
  findingId: string;

  /** Human-readable name of the field/attribute being validated */
  fieldName: string;

  /** Description of what this validation checks */
  description: string;

  /** The validation rule identifier that produced this finding */
  ruleId: string;

  /** Result status of this specific validation */
  status: ValidationFindingStatus;

  /** Method used to compare the values */
  comparisonMethod: ComparisonMethod;

  /** Value extracted from the document (preserved for audit) */
  documentValue: string | number | boolean | null;

  /** Corresponding value from the application/checklist (preserved for audit) */
  applicationValue: string | number | boolean | null;

  /** Normalized document value used for comparison (if applicable) */
  normalizedDocumentValue?: string | number | boolean | null;

  /** Normalized application value used for comparison (if applicable) */
  normalizedApplicationValue?: string | number | boolean | null;

  /** Human-readable explanation of the finding */
  explanation: string;

  /** Confidence level of the comparison (0-100) - lower for uncertain comparisons */
  confidence?: number;

  /** Whether this finding is for a mandatory/required field */
  isRequired: boolean;

  /** Additional metadata for debugging/review */
  metadata?: Record<string, unknown>;
}

/**
 * Document-specific validation rule identifiers
 * These correspond to the requirement IDs from the rule set
 */
export type ValidationRuleSetId =
  | "REQ_OCCUPANCY_CERTIFICATE"
  | "REQ_COMPANY_REGISTRATION"
  | "REQ_ARCHITECT_CERTIFICATE"
  | "REQ_RAW_MATERIALS"
  | "REQ_FINISHED_GOODS"
  | "REQ_EXISTING_FIRE_PROTECTION"
  | "REQ_HAZARDOUS_APPROVALS"
  | "REQ_PROCESS_FLOW_CHART"
  | "REQ_CIVIL_AVIATION_NOC"
  | "REQ_APPLICATION_LETTER"
  | "REQ_ARCHITECTURAL_DRAWINGS"
  | "REQ_BLOCK_PLAN"
  | "REQ_ACTIVITY_NOTE";

/**
 * Overall validation result status
 */
export type ValidationOverallStatus =
  | "passed"              // All mandatory checks passed, no unresolved issues
  | "mismatch_found"      // One or more mandatory fields have confirmed mismatches
  | "needs_review"        // Ambiguous findings require human review
  | "insufficient_data"   // Cannot complete validation due to missing extraction/application data
  | "category_mismatch"   // Document category doesn't match expected checklist requirement
  | "failed";             // Validation execution failed

/**
 * Complete validation result for a single document
 */
export interface IDocumentValidationResult {
  /** MongoDB ObjectId */
  _id?: string;

  /** Application this validation belongs to */
  applicationId: string;

  /** Uploaded document being validated */
  documentId: string;

  /** Reference to the extraction result used */
  extractionId?: string;

  /** Reference to the classification result used */
  classificationId?: string;

  /** Expected checklist requirement ID */
  expectedRequirementId: string;

  /** Predicted requirement ID from AI classification */
  predictedRequirementId?: string;

  /** Overall validation status */
  overallStatus: ValidationOverallStatus;

  /** Individual field-level findings */
  findings: IValidationFinding[];

  /** Rule set version used for validation */
  ruleSetVersion: string;

  /** Validation engine version */
  engineVersion: string;

  /** Timestamp when validation was performed */
  validatedAt: Date;

  /** User who initiated the validation */
  initiatedBy: string;

  /** Processing errors, if any */
  processingErrors?: string[];

  /** Whether this is a revalidation (update of existing) */
  isRevalidation: boolean;

  /** Previous validation result ID if revalidation */
  previousValidationId?: string;

  /** Created/updated timestamps */
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Input parameters for running validation
 */
export interface ValidationInputParams {
  applicationId: string;
  documentId: string;
  applicantId: string;
  userRole: "APPLICANT" | "INSPECTOR";
}

/**
 * Validation rule definition interface
 * Each document type has its own set of validation rules
 */
export interface IValidationRule {
  /** Unique rule identifier */
  ruleId: string;

  /** Human-readable rule name */
  name: string;

  /** Description of what this rule validates */
  description: string;

  /** The requirement IDs this rule applies to */
  applicableRequirementIds: ValidationRuleSetId[];

  /** Whether this rule is mandatory (affects overall status) */
  isMandatory: boolean;

  /** Priority/order of execution */
  priority: number;

  /** Execute the validation rule */
  execute: (context: ValidationRuleContext) => Promise<IValidationFinding>;
}

/**
 * Context provided to validation rules
 */
export interface ValidationRuleContext {
  /** The uploaded document */
  document: {
    _id: string;
    requirementId: string;
    originalFilename: string;
    mimeType: string;
  };

  /** The application record */
  application: {
    _id: string;
    applicationId: string;
    applicantDetails: {
      name: string;
      email: string;
      phone: string;
    };
    buildingDetails: {
      buildingName?: string;
      buildingType?: string;
      buildingStatus?: string;
      occupancyCategory?: string;
      location?: {
        address?: string;
        state?: string;
        district?: string;
        pincode?: string;
      };
      hasHazardousMaterials?: boolean;
      hazardousMaterialsDescription?: string;
      isHighRise?: boolean;
      buildingHeight?: number;
      numberOfFloors?: number;
      builtUpArea?: number;
      builtUpAreaUnit?: string;
    };
    architectDetails?: {
      name?: string;
      registrationNumber?: string;
      email?: string;
      phone?: string;
    };
    status: string;
  };

  /** The checklist item for this requirement */
  checklistItem: {
    requirementId: string;
    name: string;
    description: string;
    category: string;
    type: "DOCUMENT" | "INFORMATION";
    required: boolean;
    ruleReferences: string[];
    applicableReason: string;
    sourceReference: string;
    response?: {
      materials?: Array<{
        name: string;
        quantity: number;
        unit: string;
        storageLocation: string;
      }>;
      goods?: Array<{
        name: string;
        quantity: number;
        unit: string;
        storageLocation: string;
      }>;
      notes?: string;
    };
  };

  /** AI Classification result */
  classification?: {
    status: DocumentClassificationStatus;
    expectedRequirementId?: string;
    predictedRequirementId?: string;
    predictedRequirementName?: string;
    confidence: number;
    explanation: string;
    matchesExpected: boolean;
    extractedFields: Array<{
      name: string;
      value: string | number | null;
      confidence?: number;
      missing: boolean;
    }>;
    missingFields: string[];
    processingError?: string;
    processingErrorCategory?: string;
    modelUsed?: string;
  };

  /** Text Extraction result */
  extraction?: {
    status: string;
    method: TextExtractionMethod;
    pages: Array<{
      pageNumber: number;
      text: string;
      method: TextExtractionMethod;
      confidence?: number;
      error?: string;
    }>;
    totalPages: number;
    processedPages: number;
    language: string;
    textSize: number;
  };

  /** The user initiating validation */
  user: {
    userId: string;
    role: "APPLICANT" | "INSPECTOR";
  };
}

export interface ValidationEngineConfig {
  /** Engine version for tracking */
  engineVersion: string;

  /** Rule set version being used */
  ruleSetVersion: string;

  /** Enable debug logging */
  debug?: boolean;
}