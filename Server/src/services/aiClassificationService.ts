import mongoose from "mongoose";
import Document, {
  IDocument,
  DocumentProcessingStatus,
  DocumentClassificationStatus,
  ITextExtractionResult,
  IDocumentClassification,
  IExtractedField,
} from "../models/Document.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Checklist from "../models/Checklist.js";
import { REQUIREMENTS_REGISTRY } from "../rules/ruleSet.js";
import {
  createAIProvider,
  AIProvider,
  ClassificationResult,
  ExtractionResult,
  RequirementOption,
  getAvailableRequirements,
} from "./aiProviderService.js";

export class AIClassificationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "AI_CLASSIFICATION_ERROR") {
    super(message);
    this.name = "AIClassificationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ClassificationParams {
  applicationId: string;
  documentId: string;
  applicantId: string;
}

interface ExtractionParams {
  applicationId: string;
  documentId: string;
  applicantId: string;
}

export class AIClassificationService {
  private aiProvider: AIProvider;
  private availableRequirements: RequirementOption[];

  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider || createAIProvider();
    this.availableRequirements = getAvailableRequirements();
  }

  /**
   * Start or retry AI classification and extraction for a document
   */
  async classifyAndExtract(params: ClassificationParams): Promise<IDocumentClassification> {
    const document = await this.getDocumentForProcessing(params);

    if (!document) {
      throw new AIClassificationError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    // Get extraction result
    const extraction = document.extraction;
    if (!extraction || extraction.status !== "COMPLETED" && extraction.status !== "PARTIAL") {
      throw new AIClassificationError(
        "Text extraction not completed. Run text extraction first.",
        400,
        "EXTRACTION_NOT_READY"
      );
    }

    // Combine text from all pages
    const fullText = this.combineExtractedText(extraction);
    if (!fullText || fullText.trim().length < 50) {
      throw new AIClassificationError(
        "Insufficient extracted text for classification",
        422,
        "INSUFFICIENT_TEXT"
      );
    }

    // Get expected requirement from document
    const expectedRequirementId = document.requirementId;

    // Check if already processing
    const currentClassification = document.classification;
    if (
      currentClassification &&
      (currentClassification.status === DocumentClassificationStatus.PROCESSING ||
        currentClassification.status === DocumentClassificationStatus.QUEUED)
    ) {
      throw new AIClassificationError(
        "Classification already in progress",
        409,
        "CLASSIFICATION_IN_PROGRESS"
      );
    }

    // Set initial processing status
    document.classification = {
      status: DocumentClassificationStatus.PROCESSING,
      expectedRequirementId,
      confidence: 0,
      explanation: "",
      matchesExpected: false,
      extractedFields: [],
      missingFields: [],
      startedAt: new Date(),
      modelUsed: this.aiProvider.constructor.name,
    };
    document.processingStatus = DocumentProcessingStatus.PROCESSING;
    await document.save();

    // Perform classification and extraction asynchronously
    this.performClassificationAsync(document, fullText, expectedRequirementId);

    return document.classification;
  }

  /**
   * Get classification result for a document
   */
  async getClassification(params: ClassificationParams): Promise<IDocumentClassification | null> {
    const document = await this.getDocumentForProcessing(params);

    if (!document) {
      throw new AIClassificationError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    return document.classification || null;
  }

  /**
   * Perform classification and extraction asynchronously
   */
  private async performClassificationAsync(
    document: IDocument,
    fullText: string,
    expectedRequirementId: string
  ): Promise<void> {
    try {
      // Step 1: Classification
      const classification = await this.aiProvider.classify(
        fullText,
        expectedRequirementId,
        this.availableRequirements
      );

      // Step 2: Extraction (if classification succeeded)
      let extraction: ExtractionResult = { fields: [], missingFields: [] };
      let predictedId = classification.predictedRequirementId;
      let predictedName = classification.predictedRequirementName;

      // If no clear prediction, use expected requirement for extraction
      if (!predictedId || classification.confidence < 30) {
        predictedId = expectedRequirementId;
        predictedName = REQUIREMENTS_REGISTRY[expectedRequirementId]?.name || expectedRequirementId;
      }

      // Only attempt extraction if we have a valid requirement
      if (predictedId && REQUIREMENTS_REGISTRY[predictedId]) {
        const reqDef = REQUIREMENTS_REGISTRY[predictedId];
        extraction = await this.aiProvider.extract(
          fullText,
          predictedId,
          predictedName,
          reqDef.description
        );
      }

      // Step 3: Update document with results
      const matchesExpected = predictedId === expectedRequirementId;

      document.classification = {
        status: DocumentClassificationStatus.COMPLETED,
        expectedRequirementId,
        predictedRequirementId: predictedId,
        predictedRequirementName: predictedName,
        confidence: classification.confidence,
        explanation: classification.explanation,
        matchesExpected,
        extractedFields: extraction.fields,
        missingFields: extraction.missingFields,
        completedAt: new Date(),
        modelUsed: this.aiProvider.constructor.name,
      };
      document.processingStatus = DocumentProcessingStatus.PROCESSED;
      await document.save();
    } catch (error) {
      // Update document with error
      document.classification = {
        status: DocumentClassificationStatus.FAILED,
        expectedRequirementId,
        confidence: 0,
        explanation: "",
        matchesExpected: false,
        extractedFields: [],
        missingFields: [],
        processingError: error instanceof Error ? error.message : "Unknown error",
        processingErrorCategory: "AI_PROCESSING_FAILED",
        completedAt: new Date(),
        modelUsed: this.aiProvider.constructor.name,
      };
      document.processingStatus = DocumentProcessingStatus.FAILED;
      await document.save();
    }
  }

  /**
   * Get document with ownership validation
   */
  private async getDocumentForProcessing(params: ClassificationParams): Promise<IDocument | null> {
    const { applicationId, documentId, applicantId } = params;

    const appQuery = this.buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      throw new AIClassificationError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new AIClassificationError("Access denied", 403, "ACCESS_DENIED");
    }

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.SUBMITTED
    ) {
      throw new AIClassificationError(
        `Classification not allowed for applications with status: ${application.status}`,
        403,
        "INVALID_APPLICATION_STATUS"
      );
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return null;
    }

    if (document.applicationId.toString() !== application._id.toString()) {
      throw new AIClassificationError("Access denied", 403, "ACCESS_DENIED");
    }

    return document;
  }

  /**
   * Combine extracted text from all pages
   */
  private combineExtractedText(extraction: ITextExtractionResult): string {
    return extraction.pages
      .filter((p) => p.text && p.text.trim().length > 0)
      .map((p) => `--- Page ${p.pageNumber} (${p.method}) ---\n${p.text}`)
      .join("\n\n");
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
}

// Singleton instance
let aiClassificationServiceInstance: AIClassificationService | null = null;

export function getAIClassificationService(): AIClassificationService {
  if (!aiClassificationServiceInstance) {
    aiClassificationServiceInstance = new AIClassificationService();
  }
  return aiClassificationServiceInstance;
}