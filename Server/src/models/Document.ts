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