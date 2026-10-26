import mongoose from "mongoose";
import Document, {
  IDocument,
  DocumentProcessingStatus,
  DocumentClassificationStatus,
  TextExtractionStatus,
  ITextExtractionResult,
  IDocumentClassification,
} from "../models/Document.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Checklist, { IChecklist, IChecklistItem } from "../models/Checklist.js";
import { REQUIREMENTS_REGISTRY } from "../rules/ruleSet.js";
import {
  IDocumentValidationResult,
  ValidationInputParams,
  ValidationOverallStatus,
  ValidationFindingStatus,
  ValidationRuleContext,
  IValidationFinding,
  ValidationRuleSetId,
} from "../validation/findings.js";
import { getApplicableValidationRules } from "../validation/rules.js";
import { ACTIVE_RULESET_VERSION } from "../rules/ruleSet.js";

export class ValidationServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "VALIDATION_ERROR") {
    super(message);
    this.name = "ValidationServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Document Validation Service
 * Orchestrates the validation of uploaded documents against application data
 * and AI extraction/classification results.
 */
export class ValidationService {
  private readonly ENGINE_VERSION = "1.0.0";

  /**
   * Validate a document against application data and extraction results
   */
  async validateDocument(params: ValidationInputParams): Promise<IDocumentValidationResult> {
    const { applicationId, documentId, applicantId, userRole } = params;

    // 1. Load and validate document
    const document = await this.getDocumentForValidation(documentId, applicationId, applicantId, userRole);
    if (!document) {
      throw new ValidationServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    // 2. Load application
    const application = await Application.findById(document.applicationId);
    if (!application) {
      throw new ValidationServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    // 3. Load checklist
    const checklist = await Checklist.findOne({ applicationId: application._id });
    if (!checklist) {
      throw new ValidationServiceError("Checklist not generated for this application", 404, "CHECKLIST_NOT_FOUND");
    }

    // 4. Find the checklist item for this requirement
    const checklistItem = checklist.items.find(item => item.requirementId === document.requirementId);
    if (!checklistItem) {
      throw new ValidationServiceError(
        `Requirement ${document.requirementId} not found in checklist`,
        404,
        "REQUIREMENT_NOT_FOUND"
      );
    }

    // 5. Check if extraction is completed
    if (!document.extraction) {
      throw new ValidationServiceError(
        "Text extraction not performed for this document. Run text extraction first.",
        400,
        "EXTRACTION_NOT_DONE"
      );
    }

    if (document.extraction.status !== TextExtractionStatus.COMPLETED &&
        document.extraction.status !== TextExtractionStatus.PARTIAL) {
      throw new ValidationServiceError(
        `Text extraction not completed (status: ${document.extraction.status}). Cannot validate.`,
        400,
        "EXTRACTION_INCOMPLETE"
      );
    }

    // 6. Check if classification is completed
    if (!document.classification) {
      throw new ValidationServiceError(
        "AI classification not performed for this document. Run classification first.",
        400,
        "CLASSIFICATION_NOT_DONE"
      );
    }

    if (document.classification.status !== DocumentClassificationStatus.COMPLETED) {
      throw new ValidationServiceError(
        `AI classification not completed (status: ${document.classification.status}). Cannot validate.`,
        400,
        "CLASSIFICATION_INCOMPLETE"
      );
    }

    // 7. Build validation context
    const context = this.buildValidationContext(
      document,
      application,
      checklistItem,
      document.extraction,
      document.classification,
      { userId: applicantId, role: userRole }
    );

    // 8. Get applicable validation rules
    const rules = getApplicableValidationRules(document.requirementId);

    if (rules.length === 0) {
      throw new ValidationServiceError(
        `No validation rules defined for requirement ${document.requirementId}`,
        400,
        "NO_VALIDATION_RULES"
      );
    }

    // 9. Execute validation rules
    const findings: IValidationFinding[] = [];
    const processingErrors: string[] = [];

    for (const rule of rules) {
      try {
        const finding = await rule.execute(context);
        findings.push(finding);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        processingErrors.push(`Rule ${rule.ruleId} failed: ${errorMsg}`);

        // Create a failed finding for this rule
        findings.push({
          findingId: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fieldName: rule.name,
          description: rule.description,
          ruleId: rule.ruleId,
          status: "failed",
          comparisonMethod: "not_compared",
          documentValue: null,
          applicationValue: null,
          explanation: `Validation rule execution failed: ${errorMsg}`,
          isRequired: rule.isMandatory,
          metadata: { error: errorMsg },
        });
      }
    }

    // 10. Determine overall status
    const overallStatus = this.determineOverallStatus(findings, document.classification.matchesExpected);

    // 11. Create validation result
    const validationResult: IDocumentValidationResult = {
      applicationId: application._id.toString(),
      documentId: document._id.toString(),
      extractionId: document.extraction ? document._id.toString() : undefined, // reference to doc with extraction
      classificationId: document.classification ? document._id.toString() : undefined,
      expectedRequirementId: document.requirementId,
      predictedRequirementId: document.classification.predictedRequirementId,
      overallStatus,
      findings,
      ruleSetVersion: ACTIVE_RULESET_VERSION,
      engineVersion: this.ENGINE_VERSION,
      validatedAt: new Date(),
      initiatedBy: applicantId,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
      isRevalidation: false, // Will be updated if revalidation
    };

    // 12. Persist validation result
    const savedResult = await this.saveValidationResult(validationResult);

    return savedResult;
  }

  /**
   * Get the latest validation result for a document
   */
  async getValidationResult(
    applicationId: string,
    documentId: string,
    applicantId: string,
    userRole: "APPLICANT" | "INSPECTOR"
  ): Promise<IDocumentValidationResult | null> {
    // Verify access
    const document = await this.getDocumentForValidation(documentId, applicationId, applicantId, userRole);
    if (!document) {
      return null;
    }

    // Check if document has validation result embedded or in separate collection
    // For now, we'll store validation results as part of the document or in a separate collection
    // Let's check if we have a validation result stored
    const validation = (document as any).validation; // Type assertion for dynamic property

    if (validation) {
      return validation;
    }

    return null;
  }

  /**
   * Get validation history for a document
   */
  async getValidationHistory(
    applicationId: string,
    documentId: string,
    applicantId: string,
    userRole: "APPLICANT" | "INSPECTOR"
  ): Promise<IDocumentValidationResult[]> {
    // Verify access
    const document = await this.getDocumentForValidation(documentId, applicationId, applicantId, userRole);
    if (!document) {
      return [];
    }

    // For now, return single result if exists
    // In a full implementation, this would query a ValidationResult collection
    const validation = (document as any).validation;
    return validation ? [validation] : [];
  }

  /**
   * Revalidate a document (creates new validation version)
   */
  async revalidateDocument(params: ValidationInputParams): Promise<IDocumentValidationResult> {
    const existingResult = await this.getValidationResult(
      params.applicationId,
      params.documentId,
      params.applicantId,
      params.userRole
    );

    const result = await this.validateDocument(params);

    if (existingResult) {
      result.isRevalidation = true;
      result.previousValidationId = existingResult._id?.toString();
      await this.saveValidationResult(result);
    }

    return result;
  }

  /**
   * Load document with ownership/access validation
   */
  private async getDocumentForValidation(
    documentId: string,
    applicationId: string,
    applicantId: string,
    userRole: "APPLICANT" | "INSPECTOR"
  ): Promise<IDocument | null> {
    const appQuery = this.buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      throw new ValidationServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    // Check ownership for applicants
    if (userRole === "APPLICANT" && application.applicantId.toString() !== applicantId) {
      throw new ValidationServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    // For inspectors, we could add additional authorization logic here
    // For now, allow if application exists

    const document = await Document.findById(documentId);
    if (!document) {
      return null;
    }

    // Verify document belongs to this application
    if (document.applicationId.toString() !== application._id.toString()) {
      throw new ValidationServiceError("Access denied", 403, "ACCESS_DENIED");
    }

    return document;
  }

  /**
   * Build validation context for rule execution
   */
  private buildValidationContext(
    document: IDocument,
    application: any,
    checklistItem: IChecklistItem,
    extraction: ITextExtractionResult,
    classification: IDocumentClassification,
    user: { userId: string; role: "APPLICANT" | "INSPECTOR" }
  ): ValidationRuleContext {
    return {
      document: {
        _id: document._id.toString(),
        requirementId: document.requirementId,
        originalFilename: document.originalFilename,
        mimeType: document.mimeType,
      },
      application: {
        _id: application._id.toString(),
        applicationId: application.applicationId,
        applicantDetails: application.applicantDetails,
        buildingDetails: application.buildingDetails,
        architectDetails: application.architectDetails,
        status: application.status,
      },
      checklistItem: {
        requirementId: checklistItem.requirementId,
        name: checklistItem.name,
        description: checklistItem.description,
        category: checklistItem.category,
        type: checklistItem.type,
        required: checklistItem.required,
        ruleReferences: checklistItem.ruleReferences,
        applicableReason: checklistItem.applicableReason,
        sourceReference: checklistItem.sourceReference,
        response: checklistItem.response,
      },
      classification,
      extraction,
      user,
    };
  }

  /**
   * Determine overall validation status from findings
   */
  private determineOverallStatus(
    findings: IValidationFinding[],
    categoryMatches: boolean
  ): ValidationOverallStatus {
    // If category doesn't match, overall status is category_mismatch
    const categoryFinding = findings.find(f => f.ruleId.endsWith("_CATEGORY_MATCH"));
    if (categoryFinding && categoryFinding.status === "category_mismatch") {
      return "category_mismatch";
    }

    // Check for failed rules
    const hasFailed = findings.some(f => f.status === "failed");
    if (hasFailed) {
      return "failed";
    }

    // Check mandatory findings
    const mandatoryFindings = findings.filter(f => f.isRequired);

    // Check for mismatches in mandatory fields
    const hasMismatch = mandatoryFindings.some(f => f.status === "mismatch_found");
    if (hasMismatch) {
      return "mismatch_found";
    }

    // Check for needs_review in mandatory fields
    const hasNeedsReview = mandatoryFindings.some(f => f.status === "needs_review");
    if (hasNeedsReview) {
      return "needs_review";
    }

    // Check for insufficient_data in mandatory fields
    const hasInsufficientData = mandatoryFindings.some(f => f.status === "insufficient_data");
    if (hasInsufficientData) {
      return "insufficient_data";
    }

    // All mandatory checks passed
    return "passed";
  }

  /**
   * Save validation result (for now, embed in document)
   * In a production system, this would be a separate ValidationResult collection
   */
  private async saveValidationResult(result: IDocumentValidationResult): Promise<IDocumentValidationResult> {
    // For now, we'll store the validation result on the document
    // This is a simple approach - in production, a separate collection would be better
    await Document.findByIdAndUpdate(
      result.documentId,
      {
        $set: {
          "validation": {
            ...result,
            _id: result._id || new mongoose.Types.ObjectId().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      }
    );

    return result;
  }

  /**
   * Build application query from ID (handles both _id and applicationId)
   */
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
let validationServiceInstance: ValidationService | null = null;

export function getValidationService(): ValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ValidationService();
  }
  return validationServiceInstance;
}