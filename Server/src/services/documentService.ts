import mongoose from "mongoose";
import Document, {
  IDocument,
  DocumentProcessingStatus,
  DocumentVerificationStatus,
} from "../models/Document.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Checklist from "../models/Checklist.js";
import { RequirementType } from "../rules/types.js";
import {
  StorageService,
  UploadOptions,
  StorageError,
  createStorageService,
} from "./storageService.js";

// RequirementType is a type alias, use string literal for runtime comparison
const REQUIREMENT_TYPE_DOCUMENT: RequirementType = "DOCUMENT";

export class DocumentServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "DOCUMENT_ERROR") {
    super(message);
    this.name = "DocumentServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface DocumentUploadParams {
  applicationId: string;
  requirementId: string;
  applicantId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

interface DocumentListParams {
  applicationId: string;
  requirementId: string;
  applicantId: string;
}

interface DocumentRetrieveParams {
  applicationId: string;
  documentId: string;
  applicantId: string;
}

interface DocumentReplaceParams {
  applicationId: string;
  documentId: string;
  applicantId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

// Supported file types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_PAGES = 50;

export class DocumentService {
  private storage: StorageService;

  constructor(storage?: StorageService) {
    this.storage = storage || createStorageService();
  }

  // ─── Validation Helpers ──────────────────────────────────────────────────────

  private validateFile(
    originalFilename: string,
    mimeType: string,
    fileBuffer: Buffer
  ): void {
    // Check extension
    const ext = originalFilename
      .substring(originalFilename.lastIndexOf("."))
      .toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new DocumentServiceError(
        `File extension ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(
          ", "
        )}`,
        422,
        "INVALID_EXTENSION"
      );
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new DocumentServiceError(
        `MIME type ${mimeType} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`,
        422,
        "INVALID_MIME_TYPE"
      );
    }

    // Check file size
    if (fileBuffer.length === 0) {
      throw new DocumentServiceError(
        "File is empty",
        422,
        "EMPTY_FILE"
      );
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new DocumentServiceError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        422,
        "FILE_TOO_LARGE"
      );
    }

    // Validate file signature (magic bytes)
    this.validateFileSignature(fileBuffer, mimeType);
  }

  private validateFileSignature(buffer: Buffer, declaredMimeType: string): void {
    // PDF signature: %PDF
    if (declaredMimeType === "application/pdf") {
      if (buffer.length < 4 || buffer.subarray(0, 4).toString() !== "%PDF") {
        throw new DocumentServiceError(
          "File does not appear to be a valid PDF",
          422,
          "INVALID_PDF_SIGNATURE"
        );
      }
    }

    // JPEG signature: FF D8 FF
    if (declaredMimeType === "image/jpeg" || declaredMimeType === "image/jpg") {
      if (
        buffer.length < 3 ||
        buffer[0] !== 0xff ||
        buffer[1] !== 0xd8 ||
        buffer[2] !== 0xff
      ) {
        throw new DocumentServiceError(
          "File does not appear to be a valid JPEG",
          422,
          "INVALID_JPEG_SIGNATURE"
        );
      }
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (declaredMimeType === "image/png") {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
        throw new DocumentServiceError(
          "File does not appear to be a valid PNG",
          422,
          "INVALID_PNG_SIGNATURE"
        );
      }
    }
  }

  private getUploadOptions(mimeType: string): UploadOptions {
    const isPdf = mimeType === "application/pdf";
    return {
      folder: "fire-noc-documents",
      resourceType: isPdf ? "raw" : "image",
      deliveryType: "private",
      allowedFormats: isPdf ? ["pdf"] : ["jpg", "jpeg", "png"],
      maxFileSize: MAX_FILE_SIZE,
      maxPages: isPdf ? MAX_PDF_PAGES : undefined,
    };
  }

  private buildAppQuery(id: string | string[]) {
    const singleId = Array.isArray(id) ? id[0] : id;
    if (
      mongoose.Types.ObjectId.isValid(singleId) &&
      String(new mongoose.Types.ObjectId(singleId)) === singleId
    ) {
      return { _id: singleId };
    }
    return { applicationId: singleId };
  }

  // ─── Core Operations ─────────────────────────────────────────────────────────

  async uploadDocument(params: DocumentUploadParams): Promise<IDocument> {
    const {
      applicationId,
      requirementId,
      applicantId,
      fileBuffer,
      originalFilename,
      mimeType,
    } = params;

    // 1. Validate file
    this.validateFile(originalFilename, mimeType, fileBuffer);

    // 2. Find and validate application
    const appQuery = this.buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      throw new DocumentServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    // 3. Verify ownership
    if (application.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    // 4. Check application status - only allow uploads for DRAFT or SUBMITTED
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.SUBMITTED
    ) {
      throw new DocumentServiceError(
        `Document uploads not allowed for applications with status: ${application.status}`,
        403,
        "INVALID_APPLICATION_STATUS"
      );
    }

    // 5. Find checklist
    const checklist = await Checklist.findOne({ applicationId: application._id });
    if (!checklist) {
      throw new DocumentServiceError(
        "Checklist not generated for this application",
        404,
        "CHECKLIST_NOT_FOUND"
      );
    }

    // 6. Verify requirement exists and supports document uploads
    const checklistItem = checklist.items.find(
      (item) => item.requirementId === requirementId
    );
    if (!checklistItem) {
      throw new DocumentServiceError(
        `Requirement ${requirementId} not found in checklist`,
        404,
        "REQUIREMENT_NOT_FOUND"
      );
    }

    if (checklistItem.type !== REQUIREMENT_TYPE_DOCUMENT) {
      throw new DocumentServiceError(
        `Requirement ${requirementId} does not accept document uploads (type: ${checklistItem.type})`,
        422,
        "INVALID_REQUIREMENT_TYPE"
      );
    }

    // 7. Check for existing document and determine version
    const existingDoc = await Document.findOne({
      applicationId: application._id,
      requirementId,
    }).sort({ version: -1 });

    const version = existingDoc ? existingDoc.version + 1 : 1;
    const previousDocumentId = existingDoc?._id;

    // 8. Upload to Cloudinary
    const uploadOptions = this.getUploadOptions(mimeType);
    let uploadResult;
    try {
      uploadResult = await this.storage.upload(fileBuffer, uploadOptions);
    } catch (error) {
      if (error instanceof StorageError) {
        throw new DocumentServiceError(
          `File upload failed: ${error.message}`,
          500,
          "UPLOAD_FAILED"
        );
      }
      throw new DocumentServiceError(
        "File upload failed",
        500,
        "UPLOAD_FAILED"
      );
    }

    // 9. Create document metadata record
    const document = await Document.create({
      applicationId: application._id,
      applicantId,
      checklistId: checklist._id,
      requirementId,
      originalFilename,
      cloudinaryPublicId: uploadResult.publicId,
      cloudinaryResourceType: uploadResult.resourceType as any,
      cloudinaryDeliveryType: uploadResult.deliveryType,
      mimeType,
      fileSize: uploadResult.bytes,
      checksum: uploadResult.checksum,
      uploaderId: applicantId,
      processingStatus: DocumentProcessingStatus.UPLOADED,
      verificationStatus: DocumentVerificationStatus.NOT_STARTED,
      version,
      previousDocumentId,
      uploadedAt: new Date(),
    });

    return document;
  }

  async replaceDocument(params: DocumentReplaceParams): Promise<IDocument> {
    const {
      applicationId,
      documentId,
      applicantId,
      fileBuffer,
      originalFilename,
      mimeType,
    } = params;

    // Validate file
    this.validateFile(originalFilename, mimeType, fileBuffer);

    // Find existing document
    const existingDoc = await Document.findById(documentId);
    if (!existingDoc) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    // Verify ownership
    if (existingDoc.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    // Verify application ownership and status
    const application = await Application.findById(existingDoc.applicationId);
    if (!application) {
      throw new DocumentServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.SUBMITTED
    ) {
      throw new DocumentServiceError(
        `Document replacement not allowed for applications with status: ${application.status}`,
        403,
        "INVALID_APPLICATION_STATUS"
      );
    }

    // Upload new file
    const uploadOptions = this.getUploadOptions(mimeType);
    let uploadResult;
    try {
      uploadResult = await this.storage.upload(fileBuffer, uploadOptions);
    } catch (error) {
      if (error instanceof StorageError) {
        throw new DocumentServiceError(
          `File upload failed: ${error.message}`,
          500,
          "UPLOAD_FAILED"
        );
      }
      throw new DocumentServiceError("File upload failed", 500, "UPLOAD_FAILED");
    }

    // Create new version document
    const newVersion = existingDoc.version + 1;
    const document = await Document.create({
      applicationId: existingDoc.applicationId,
      applicantId,
      checklistId: existingDoc.checklistId,
      requirementId: existingDoc.requirementId,
      originalFilename,
      cloudinaryPublicId: uploadResult.publicId,
      cloudinaryResourceType: uploadResult.resourceType as any,
      cloudinaryDeliveryType: uploadResult.deliveryType,
      mimeType,
      fileSize: uploadResult.bytes,
      checksum: uploadResult.checksum,
      uploaderId: applicantId,
      processingStatus: DocumentProcessingStatus.UPLOADED,
      verificationStatus: DocumentVerificationStatus.NOT_STARTED,
      version: newVersion,
      previousDocumentId: existingDoc._id,
      uploadedAt: new Date(),
    });

    // Note: We keep the old document for audit history
    // The old file in Cloudinary could be cleaned up in a background job later

    return document;
  }

  async listDocuments(params: DocumentListParams): Promise<IDocument[]> {
    const { applicationId, requirementId, applicantId } = params;

    const appQuery = this.buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      throw new DocumentServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    const documents = await Document.find({
      applicationId: application._id,
      requirementId,
    }).sort({ version: -1 });

    return documents;
  }

  async getDocument(params: DocumentRetrieveParams): Promise<IDocument | null> {
    const { applicationId, documentId, applicantId } = params;

    const appQuery = this.buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      throw new DocumentServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return null;
    }

    // Verify document belongs to this application
    if (document.applicationId.toString() !== application._id.toString()) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    return document;
  }

  async getDocumentDownloadUrl(
    applicationId: string,
    documentId: string,
    applicantId: string,
    expiresIn = 3600
  ): Promise<string> {
    const document = await this.getDocument({ applicationId, documentId, applicantId });
    if (!document) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    return this.storage.generateSignedUrl(document.cloudinaryPublicId, {
      resourceType: document.cloudinaryResourceType,
      deliveryType: document.cloudinaryDeliveryType as any,
      expiresIn,
      attachment: true,
    });
  }

  async deleteDocument(
    applicationId: string,
    documentId: string,
    applicantId: string
  ): Promise<void> {
    const document = await this.getDocument({ applicationId, documentId, applicantId });
    if (!document) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    // Verify ownership
    if (document.applicantId.toString() !== applicantId) {
      throw new DocumentServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    // Check application status
    const application = await Application.findById(document.applicationId);
    if (!application) {
      throw new DocumentServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.SUBMITTED
    ) {
      throw new DocumentServiceError(
        `Document deletion not allowed for applications with status: ${application.status}`,
        403,
        "INVALID_APPLICATION_STATUS"
      );
    }

    // Delete from Cloudinary
    try {
      await this.storage.delete(
        document.cloudinaryPublicId,
        document.cloudinaryResourceType
      );
    } catch (error) {
      // Log but don't fail - we still want to remove the metadata
      console.error("Failed to delete from Cloudinary:", error);
    }

    // Delete metadata
    await Document.findByIdAndDelete(documentId);
  }
}

// Singleton instance
let documentServiceInstance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
  if (!documentServiceInstance) {
    documentServiceInstance = new DocumentService();
  }
  return documentServiceInstance;
}