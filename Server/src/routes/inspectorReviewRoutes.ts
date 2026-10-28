import { Router } from "express";
import {
  startDocumentReview,
  completeDocumentReview,
  updateFindingReview,
  getDocumentReview,
  getApplicationReviewSummary,
  getDocumentForInspector,
  listApplicationsForInspector,
  getDocumentDownloadForInspector,
} from "../controllers/inspectorReviewController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { UserRole } from "../models/User.js";

const router = Router();

// All routes require authentication and INSPECTOR role
router.use(authenticateToken, authorizeRoles(UserRole.INSPECTOR));

/**
 * @route   GET /api/inspector/applications
 * @desc    List applications for inspector review
 * @access  Private (INSPECTOR)
 */
router.get("/applications", listApplicationsForInspector);

/**
 * @route   GET /api/inspector/applications/:id/review-summary
 * @desc    Get review summary for all documents in an application
 * @access  Private (INSPECTOR)
 */
router.get("/applications/:id/review-summary", getApplicationReviewSummary);
router.get("/:id/review-summary", getApplicationReviewSummary);

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId/download
 * @desc    Get document download URL for inspector review
 * @access  Private (INSPECTOR)
 */
router.get(
  "/applications/:id/documents/:documentId/download",
  getDocumentDownloadForInspector
);
router.get("/:id/documents/:documentId/download", getDocumentDownloadForInspector);

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId
 * @desc    Get full document details for inspector review
 * @access  Private (INSPECTOR)
 */
router.get("/applications/:id/documents/:documentId", getDocumentForInspector);
router.get("/:id/documents/:documentId", getDocumentForInspector);

/**
 * @route   POST /api/inspector/applications/:id/documents/:documentId/review/start
 * @desc    Start reviewing a document
 * @access  Private (INSPECTOR)
 */
router.post(
  "/applications/:id/documents/:documentId/review/start",
  startDocumentReview
);
router.post("/:id/documents/:documentId/review/start", startDocumentReview);

/**
 * @route   POST /api/inspector/applications/:id/documents/:documentId/review/complete
 * @desc    Complete document review with findings
 * @access  Private (INSPECTOR)
 */
router.post(
  "/applications/:id/documents/:documentId/review/complete",
  completeDocumentReview
);
router.post("/:id/documents/:documentId/review/complete", completeDocumentReview);

/**
 * @route   PATCH /api/inspector/applications/:id/documents/:documentId/review/findings/:findingId
 * @desc    Update review status for a specific finding
 * @access  Private (INSPECTOR)
 */
router.patch(
  "/applications/:id/documents/:documentId/review/findings/:findingId",
  updateFindingReview
);
router.patch(
  "/:id/documents/:documentId/review/findings/:findingId",
  updateFindingReview
);

/**
 * @route   GET /api/inspector/applications/:id/documents/:documentId/review
 * @desc    Get document review status
 * @access  Private (INSPECTOR)
 */
router.get("/applications/:id/documents/:documentId/review", getDocumentReview);
router.get("/:id/documents/:documentId/review", getDocumentReview);

export default router;