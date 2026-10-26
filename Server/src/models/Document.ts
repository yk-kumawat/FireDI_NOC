import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export enum DocumentProcessingStatus {
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
}

export enum DocumentVerificationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING_REVIEW = "PENDING_REVIEW",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum DocumentResourceType {
  IMAGE = "image",
  RAW = "raw",
  AUTO = "auto",
}

export enum TextExtractionStatus {
  NOT_STARTED = "NOT_STARTED",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL",
  FAILED = "FAILED",
}

export enum TextExtractionMethod {
  EMBEDDED = "EMBEDDED",
  OCR = "OCR",
  MIXED = "MIXED",
}

export enum DocumentClassificationStatus {
  NOT_STARTED = "NOT_STARTED",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface IExtractedField {
  name: string;
  value: string | number | null;
  confidence?: number;
  missing: boolean;
}

export interface IDocumentClassification {
  status: DocumentClassificationStatus;
  expectedRequirementId?: string;
  predictedRequirementId?: string;
  predictedRequirementName?: string;
  confidence: number; // 0-100
  explanation: string;
  matchesExpected: boolean;
  extractedFields: IExtractedField[];
  missingFields: string[];
  processingError?: string;
  processingErrorCategory?: string;
  startedAt?: Date;
  completedAt?: Date;
  modelUsed?: string;
}

export interface IExtractedPage {
  pageNumber: number;
  text: string;
  method: TextExtractionMethod;
  confidence?: number;
  error?: string;
}

export interface ITextExtractionResult {
  status: TextExtractionStatus;
  method: TextExtractionMethod;
  pages: IExtractedPage[];
  totalPages: number;
  processedPages: number;
  language: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  errorCategory?: string;
  textSize: number;
}

export interface IDocumentClassification {
  status: DocumentClassificationStatus;
  expectedRequirementId?: string;
  predictedRequirementId?: string;
  predictedRequirementName?: string;
  confidence: number;
  explanation: string;
  matchesExpected: boolean;
  extractedFields: IExtractedField[];
  missingFields: string[];
  processingError?: string;
  processingErrorCategory?: string;
  startedAt?: Date;
  completedAt?: Date;
  modelUsed?: string;
}

// ─── Validation Result Types ───────────────────────────────────────────────────
export enum ValidationOverallStatus {
  PASSED = "passed",
  MISMATCH_FOUND = "mismatch_found",
  NEEDS_REVIEW = "needs_review",
  INSUFFICIENT_DATA = "insufficient_data",
  CATEGORY_MISMATCH = "category_mismatch",
  FAILED = "failed",
}

export enum ValidationFindingStatus {
  PASSED = "passed",
  MISMATCH_FOUND = "mismatch_found",
  NEEDS_REVIEW = "needs_review",
  INSUFFICIENT_DATA = "insufficient_data",
  NOT_APPLICABLE = "not_applicable",
  FAILED = "failed",
}

export interface IValidationFinding {
  findingId: string;
  fieldName: string;
  description: string;
  ruleId: string;
  status: ValidationFindingStatus;
  comparisonMethod: string;
  documentValue: mongoose.Schema.Types.Mixed;
  applicationValue: mongoose.Schema.Types.Mixed;
  normalizedDocumentValue?: mongoose.Schema.Types.Mixed;
  normalizedApplicationValue?: mongoose.Schema.Types.Mixed;
  explanation: string;
  confidence?: number;
  isRequired: boolean;
  metadata?: mongoose.Schema.Types.Mixed;
}

export interface IDocumentValidationResult {
  _id?: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  extractionId?: mongoose.Types.ObjectId;
  classificationId?: mongoose.Types.ObjectId;
  expectedRequirementId: string;
  predictedRequirementId?: string;
  overallStatus: ValidationOverallStatus;
  findings: IValidationFinding[];
  ruleSetVersion: string;
  engineVersion: string;
  validatedAt: Date;
  initiatedBy: mongoose.Types.ObjectId;
  processingErrors?: string[];
  isRevalidation: boolean;
  previousValidationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends MongooseDocument {
  applicationId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  checklistId: mongoose.Types.ObjectId;
  requirementId: string;
  originalFilename: string;
  cloudinaryPublicId: string;
  cloudinaryResourceType: DocumentResourceType;
  cloudinaryDeliveryType: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  uploaderId: mongoose.Types.ObjectId;
  processingStatus: DocumentProcessingStatus;
  verificationStatus: DocumentVerificationStatus;
  version: number;
  previousDocumentId?: mongoose.Types.ObjectId;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Text extraction fields
  extraction?: ITextExtractionResult;
  // AI Classification & Extraction fields
  classification?: IDocumentClassification;
  // Document Validation fields
  validation?: IDocumentValidationResult;
}

// Sub-schema for extracted pages
const extractedPageSchema = new Schema<IExtractedPage>(
  {
    pageNumber: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, default: "" },
    method: {
      type: String,
      enum: Object.values(TextExtractionMethod),
      required: true,
    },
    confidence: { type: Number, min: 0, max: 100 },
    error: { type: String, trim: true },
  },
  { _id: false }
);

const textExtractionResultSchema = new Schema<ITextExtractionResult>(
  {
    status: {
      type: String,
      enum: Object.values(TextExtractionStatus),
      required: true,
      default: TextExtractionStatus.NOT_STARTED,
    },
    method: {
      type: String,
      enum: Object.values(TextExtractionMethod),
      required: true,
    },
    pages: { type: [extractedPageSchema], default: [] },
    totalPages: { type: Number, required: true, min: 0 },
    processedPages: { type: Number, required: true, min: 0 },
    language: { type: String, required: true, default: "eng" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String, trim: true },
    errorCategory: { type: String, trim: true },
    textSize: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const extractedFieldSchema = new Schema<IExtractedField>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed },
    confidence: { type: Number, min: 0, max: 100 },
    missing: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const documentClassificationSchema = new Schema<IDocumentClassification>(
  {
    status: {
      type: String,
      enum: Object.values(DocumentClassificationStatus),
      required: true,
      default: DocumentClassificationStatus.NOT_STARTED,
    },
    expectedRequirementId: { type: String, trim: true },
    predictedRequirementId: { type: String, trim: true },
    predictedRequirementName: { type: String, trim: true },
    confidence: { type: Number, required: true, min: 0, max: 100, default: 0 },
    explanation: { type: String, required: true, trim: true, default: "" },
    matchesExpected: { type: Boolean, required: true, default: false },
    extractedFields: { type: [extractedFieldSchema], default: [] },
    missingFields: { type: [String], default: [] },
    processingError: { type: String, trim: true },
    processingErrorCategory: { type: String, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    modelUsed: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Validation Result Sub-schemas ──────────────────────────────────────────────
const validationFindingSchema = new Schema<IValidationFinding>(
  {
    findingId: { type: String, required: true, trim: true },
    fieldName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    ruleId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(ValidationFindingStatus),
      required: true,
    },
    comparisonMethod: { type: String, required: true, trim: true },
    documentValue: { type: Schema.Types.Mixed },
    applicationValue: { type: Schema.Types.Mixed },
    normalizedDocumentValue: { type: Schema.Types.Mixed },
    normalizedApplicationValue: { type: Schema.Types.Mixed },
    explanation: { type: String, required: true, trim: true },
    confidence: { type: Number, min: 0, max: 100 },
    isRequired: { type: Boolean, required: true, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const documentValidationResultSchema = new Schema<IDocumentValidationResult>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    extractionId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: false,
    },
    classificationId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: false,
    },
    expectedRequirementId: { type: String, required: true, trim: true },
    predictedRequirementId: { type: String, trim: true },
    overallStatus: {
      type: String,
      enum: Object.values(ValidationOverallStatus),
      required: true,
    },
    findings: { type: [validationFindingSchema], default: [] },
    ruleSetVersion: { type: String, required: true, trim: true },
    engineVersion: { type: String, required: true, trim: true },
    validatedAt: { type: Date, required: true, default: Date.now },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    processingErrors: { type: [String], default: [] },
    isRevalidation: { type: Boolean, required: true, default: false },
    previousValidationId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: false,
    },
  },
  { _id: true, timestamps: true }
);

// Sub-schema for version history reference
const documentSchema = new Schema<IDocument>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checklistId: {
      type: Schema.Types.ObjectId,
      ref: "Checklist",
      required: true,
    },
    requirementId: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryResourceType: {
      type: String,
      enum: Object.values(DocumentResourceType),
      required: true,
    },
    cloudinaryDeliveryType: {
      type: String,
      required: true,
      trim: true,
      default: "private",
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    checksum: {
      type: String,
      trim: true,
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    processingStatus: {
      type: String,
      enum: Object.values(DocumentProcessingStatus),
      default: DocumentProcessingStatus.UPLOADED,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(DocumentVerificationStatus),
      default: DocumentVerificationStatus.NOT_STARTED,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    previousDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    extraction: { type: textExtractionResultSchema, required: false },
    classification: { type: documentClassificationSchema, required: false },
    validation: { type: documentValidationResultSchema, required: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentSchema.index({ applicationId: 1, requirementId: 1 });
documentSchema.index({ applicantId: 1, applicationId: 1 });
documentSchema.index({ checklistId: 1, requirementId: 1 });
documentSchema.index({ cloudinaryPublicId: 1 }, { unique: true });
documentSchema.index({ uploaderId: 1, uploadedAt: -1 });
documentSchema.index({ previousDocumentId: 1 });

// Compound unique index to prevent duplicate active documents for same requirement
documentSchema.index(
  { applicationId: 1, requirementId: 1, version: 1 },
  { unique: true }
);

const Document = mongoose.model<IDocument>("Document", documentSchema);

export default Document;