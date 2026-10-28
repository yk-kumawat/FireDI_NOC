import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "./authController.js";
import Document, {
  IDocument,
  DocumentVerificationStatus,
  ReviewStatus,
  IDocumentReview,
} from "../models/Document.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Checklist from "../models/Checklist.js";

export class ReviewServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "REVIEW_ERROR") {
    super(message);
    this.name = "ReviewServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ReviewActionParams {
  applicationId: string;
  documentId: string;
  reviewerId: string;
  userRole: "INSPECTOR";
}

interface UpdateFindingReviewParams extends ReviewActionParams {
  findingId: string;
  status: ReviewStatus;
  note?: string;
}

interface UpdateDocumentReviewParams extends ReviewActionParams {
  status: ReviewStatus;
  overallNote?: string;
  findings: Array<{
    findingId: string;
    status: ReviewStatus;
    note?: string;
  }>;
}

// Helper to extract single value from params (handles string | string[])
const getParam = (param: string | string[]): string => (Array.isArray(param) ? param[0] : param);

/**
 * @route   POST /api/inspector/applications/:id/documents/:documentId/review/start
 * @desc    Start reviewing a document (mark as IN_REVIEW)
 * @access  Private (INSPECTOR)
 */
export const startDocumentReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    // Initialize review if not exists
    if (!document.review) {
      document.review = {
        documentId: document._id,
        applicationId: document.applicationId,
        reviewerId: new mongoose.Types.ObjectId(reviewerId),
        status: ReviewStatus.IN_REVIEW,
        findings: document.validation?.findings.map((f) => ({
          findingId: f.findingId,
          status: ReviewStatus.NOT_REVIEWED,
        })) || [],
        startedAt: new Date(),
      } as IDocumentReview;
    } else {
      document.review.status = ReviewStatus.IN_REVIEW;
      document.review.reviewerId = new mongoose.Types.ObjectId(reviewerId);
      // Ensure all findings have review entries
      if (document.validation?.findings) {
        for (const finding of document.validation.findings) {
          const existing = document.review.findings.find(
            (rf) => rf.findingId === finding.findingId
          );
          if (!existing) {
            document.review.findings.push({
              findingId: finding.findingId,
              status: ReviewStatus.NOT_REVIEWED,
            });
          }
        }
      }
    }

    // Update document verification status
    document.verificationStatus = DocumentVerificationStatus.PENDING_REVIEW;

    await document.save();

    res.status(200).json({
      success: true,
      message: "Document review started",
      data: { review: document.review },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("startDocumentReview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start document review",
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/inspector/applications/:id/documents/:documentId/review/complete
 * @desc    Complete document review with findings
 * @access  Private (INSPECTOR)
 */
export const completeDocumentReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);
    const { status, overallNote, findings } = req.body as UpdateDocumentReviewParams;

    if (!status || !Object.values(ReviewStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid review status is required",
      });
      return;
    }

    if (!Array.isArray(findings)) {
      res.status(400).json({
        success: false,
        message: "Findings array is required",
      });
      return;
    }

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    if (!document.review) {
      res.status(400).json({
        success: false,
        message: "Review not started for this document",
      });
      return;
    }

    // Update review
    document.review.status = status;
    document.review.overallNote = overallNote;
    document.review.completedAt = new Date();

    // Update individual findings
    for (const findingUpdate of findings) {
      const reviewFinding = document.review.findings.find(
        (rf) => rf.findingId === findingUpdate.findingId
      );
      if (reviewFinding) {
        reviewFinding.status = findingUpdate.status;
        reviewFinding.reviewerNote = findingUpdate.note;
        reviewFinding.reviewedAt = new Date();
        reviewFinding.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
      }
    }

    // Update document verification status based on review outcome
    if (status === ReviewStatus.REVIEWED) {
      document.verificationStatus = DocumentVerificationStatus.VERIFIED;
    } else if (status === ReviewStatus.FLAGGED_FOR_CORRECTION) {
      document.verificationStatus = DocumentVerificationStatus.REJECTED;
    }

    await document.save();

    res.status(200).json({
      success: true,
      message: "Document review completed",
      data: { review: document.review },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("completeDocumentReview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete document review",
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/inspector/applications/:id/documents/:documentId/review/findings/:findingId
 * @desc    Update review status for a specific finding
 * @access  Private (INSPECTOR)
 */
export const updateFindingReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);
    const findingId = getParam(req.params.findingId);
    const { status, note } = req.body as {
      status: ReviewStatus;
      note?: string;
    };

    if (!status || !Object.values(ReviewStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid review status is required",
      });
      return;
    }

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    if (!document.review) {
      res.status(400).json({
        success: false,
        message: "Review not started for this document",
      });
      return;
    }

    const reviewFinding = document.review.findings.find((rf) => rf.findingId === findingId);
    if (!reviewFinding) {
      res.status(404).json({
        success: false,
        message: "Finding not found in review",
      });
      return;
    }

    reviewFinding.status = status;
    reviewFinding.reviewerNote = note;
    reviewFinding.reviewedAt = new Date();
    reviewFinding.reviewedBy = new mongoose.Types.ObjectId(reviewerId);

    // Check if all findings are reviewed to update overall status
    const allReviewed = document.review.findings.every(
      (rf) => rf.status === ReviewStatus.REVIEWED || rf.status === ReviewStatus.FLAGGED_FOR_CORRECTION
    );
    if (allReviewed && document.review.status === ReviewStatus.IN_REVIEW) {
      document.review.status = ReviewStatus.REVIEWED;
      document.review.completedAt = new Date();
    }

    await document.save();

    res.status(200).json({
      success: true,
      message: "Finding review updated",
      data: { review: document.review },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("updateFindingReview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update finding review",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId/review
 * @desc    Get document review status
 * @access  Private (INSPECTOR)
 */
export const getDocumentReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: { review: document.review || null },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getDocumentReview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve document review",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/inspector/applications/:id/review-summary
 * @desc    Get review summary for all documents in an application
 * @access  Private (INSPECTOR)
 */
export const getApplicationReviewSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);

    // Verify application exists and inspector has access
    const appQuery = buildAppQuery(applicationId);
    const application = await Application.findOne(appQuery);
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    // Get all documents for this application
    const documents = await Document.find({ applicationId: application._id })
      .select("_id requirementId originalFilename verificationStatus review validation")
      .lean();

    // Get checklist for requirement details
    const checklist = await Checklist.findOne({ applicationId: application._id }).lean();

    const summary = documents.map((doc) => {
      const checklistItem = checklist?.items.find((item) => item.requirementId === doc.requirementId);
      const validation = doc.validation;
      const review = doc.review;

      return {
        documentId: doc._id,
        requirementId: doc.requirementId,
        requirementName: checklistItem?.name || doc.requirementId,
        required: checklistItem?.required ?? true,
        originalFilename: doc.originalFilename,
        verificationStatus: doc.verificationStatus,
        validationStatus: validation?.overallStatus || "not_validated",
        validationFindingsCount: validation?.findings?.length || 0,
        reviewStatus: review?.status || ReviewStatus.NOT_REVIEWED,
        reviewCompletedAt: review?.completedAt,
        hasValidationErrors: validation?.processingErrors && validation.processingErrors.length > 0,
      };
    });

    // Calculate overall stats
    const requiredDocs = summary.filter((d) => d.required);
    const stats = {
      totalRequired: requiredDocs.length,
      uploaded: requiredDocs.filter((d) => d.verificationStatus !== DocumentVerificationStatus.NOT_STARTED).length,
      pendingReview: requiredDocs.filter((d) => d.verificationStatus === DocumentVerificationStatus.PENDING_REVIEW).length,
      verified: requiredDocs.filter((d) => d.verificationStatus === DocumentVerificationStatus.VERIFIED).length,
      rejected: requiredDocs.filter((d) => d.verificationStatus === DocumentVerificationStatus.REJECTED).length,
      notUploaded: requiredDocs.filter((d) => d.verificationStatus === DocumentVerificationStatus.NOT_STARTED).length,
      validationPassed: requiredDocs.filter((d) => d.validationStatus === "passed").length,
      validationMismatch: requiredDocs.filter((d) => d.validationStatus === "mismatch_found").length,
      validationNeedsReview: requiredDocs.filter((d) => d.validationStatus === "needs_review").length,
    };

    res.status(200).json({
      success: true,
      data: {
        applicationId: application._id,
        applicationNumber: application.applicationId,
        applicantName: application.applicantDetails?.name,
        stats,
        documents: summary,
      },
    });
  } catch (error: any) {
    console.error("getApplicationReviewSummary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve review summary",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId
 * @desc    Get full document details for inspector review
 * @access  Private (INSPECTOR)
 */
export const getDocumentForInspector = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    // Get download URL
    const { createStorageService } = await import("../services/storageService.js");
    const storage = createStorageService();
    const downloadUrl = storage.generateSignedUrl(document.cloudinaryPublicId, {
      resourceType: document.cloudinaryResourceType,
      deliveryType: document.cloudinaryDeliveryType as any,
      expiresIn: 3600,
      attachment: true,
    });

    res.status(200).json({
      success: true,
      data: {
        document: {
          _id: document._id,
          requirementId: document.requirementId,
          originalFilename: document.originalFilename,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          version: document.version,
          processingStatus: document.processingStatus,
          verificationStatus: document.verificationStatus,
          uploadedAt: document.uploadedAt,
          downloadUrl,
          extraction: document.extraction,
          classification: document.classification,
          validation: document.validation,
          review: document.review,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getDocumentForInspector error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve document",
      error: error.message,
    });
  }
};

/**
 * Helper to load document with inspector access validation
 */
async function getDocumentForReview(
  documentId: string,
  applicationId: string,
  reviewerId: string
): Promise<IDocument | null> {
  const appQuery = buildAppQuery(applicationId);
  const application = await Application.findOne(appQuery);
  if (!application) {
    throw new ReviewServiceError("Application not found", 404, "APPLICATION_NOT_FOUND");
  }

  // For inspectors, we verify the application exists
  // In a real system, you might check inspector assignment/region

  const document = await Document.findById(documentId);
  if (!document) {
    return null;
  }

  // Verify document belongs to this application
  if (document.applicationId.toString() !== application._id.toString()) {
    throw new ReviewServiceError("Access denied", 403, "ACCESS_DENIED");
  }

  return document;
}

/**
 * @route   GET /api/inspector/applications
 * @desc    List applications for inspector review with pagination, status filter, search
 * @access  Private (INSPECTOR)
 */
export const listApplicationsForInspector = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "10"), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const statusParam = req.query.status as string | undefined;
    if (statusParam && statusParam !== "all") {
      filter.status = statusParam;
    }

    const search = req.query.search as string | undefined;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { applicationId: searchRegex },
        { "buildingDetails.buildingName": searchRegex },
        { "applicantDetails.name": searchRegex },
        { "applicantDetails.email": searchRegex },
      ];
    }

    const [applications, total, stats] = await Promise.all([
      Application.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Application.countDocuments(filter),
      Application.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statMap: Record<string, number> = {
      total: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      DRAFT: 0,
    };

    let totalAll = 0;
    stats.forEach((s) => {
      statMap[s._id] = s.count;
      totalAll += s.count;
    });
    statMap.total = totalAll;

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        stats: statMap,
      },
    });
  } catch (error: any) {
    console.error("listApplicationsForInspector error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications for inspector",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId/download
 * @desc    Get signed download URL for an inspector reviewing a document
 * @access  Private (INSPECTOR)
 */
export const getDocumentDownloadForInspector = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const document = await getDocumentForReview(documentId, applicationId, reviewerId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    const { createStorageService } = await import("../services/storageService.js");
    const storage = createStorageService();
    const downloadUrl = storage.generateSignedUrl(document.cloudinaryPublicId, {
      resourceType: document.cloudinaryResourceType,
      deliveryType: document.cloudinaryDeliveryType as any,
      expiresIn: 3600,
      attachment: true,
    });

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
      },
    });
  } catch (error: any) {
    if (error instanceof ReviewServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getDocumentDownloadForInspector error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate download URL",
      error: error.message,
    });
  }
};

function buildAppQuery(id: string | string[]) {
  const singleId = Array.isArray(id) ? id[0] : id;
  if (
    mongoose.Types.ObjectId.isValid(singleId) &&
    String(new mongoose.Types.ObjectId(singleId)) === singleId
  ) {
    return { _id: singleId };
  }
  return { applicationId: singleId };
}