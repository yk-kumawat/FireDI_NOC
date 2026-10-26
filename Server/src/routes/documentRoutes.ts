import { Router } from "express";
import {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentDownloadUrl,
  replaceDocument,
  deleteDocument,
  extractText,
  getExtraction,
  classifyDocument,
  getClassification,
} from "../controllers/documentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { UserRole } from "../models/User.js";

const router = Router();

// All routes require authentication and APPLICANT role
router.use(authenticateToken, authorizeRoles(UserRole.APPLICANT));

/**
 * @route   POST /api/applications/:id/checklist/items/:requirementId/documents
 * @desc    Upload a document for a checklist requirement
 * @access  Private (APPLICANT)
 */
router.post(
  "/:id/checklist/items/:requirementId/documents",
  uploadDocument
);

/**
 * @route   GET /api/applications/:id/checklist/items/:requirementId/documents
 * @desc    List documents for a checklist requirement
 * @access  Private (APPLICANT)
 */
router.get(
  "/:id/checklist/items/:requirementId/documents",
  listDocuments
);

/**
 * @route   GET /api/applications/:id/documents/:documentId
 * @desc    Get document metadata
 * @access  Private (APPLICANT)
 */
router.get("/:id/documents/:documentId", getDocument);

/**
 * @route   GET /api/applications/:id/documents/:documentId/download
 * @desc    Get signed download URL for a document
 * @access  Private (APPLICANT)
 */
router.get("/:id/documents/:documentId/download", getDocumentDownloadUrl);

/**
 * @route   PUT /api/applications/:id/documents/:documentId
 * @desc    Replace a document (creates new version)
 * @access  Private (APPLICANT)
 */
router.put("/:id/documents/:documentId", replaceDocument);

/**
 * @route   DELETE /api/applications/:id/documents/:documentId
 * @desc    Delete a document
 * @access  Private (APPLICANT)
 */
router.delete("/:id/documents/:documentId", deleteDocument);

/**
 * @route   POST /api/applications/:id/documents/:documentId/extract-text
 * @desc    Start or retry text extraction for a document
 * @access  Private (APPLICANT)
 */
router.post("/:id/documents/:documentId/extract-text", extractText);

/**
 * @route   GET /api/applications/:id/documents/:documentId/extraction
 * @desc    Get text extraction result for a document
 * @access  Private (APPLICANT)
 */
router.get("/:id/documents/:documentId/extraction", getExtraction);

/**
 * @route   POST /api/applications/:id/documents/:documentId/classify
 * @desc    Start or retry AI classification & extraction for a document
 * @access  Private (APPLICANT)
 */
router.post("/:id/documents/:documentId/classify", classifyDocument);

/**
 * @route   GET /api/applications/:id/documents/:documentId/classification
 * @desc    Get AI classification & extraction result for a document
 * @access  Private (APPLICANT)
 */
router.get("/:id/documents/:documentId/classification", getClassification);

export default router;