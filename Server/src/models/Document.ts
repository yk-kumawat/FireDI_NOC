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
}

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