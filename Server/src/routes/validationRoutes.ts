import { Router } from "express";
import {
  validateDocument,
  revalidateDocument,
  getValidation,
  getValidationHistory,
} from "../controllers/validationController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { UserRole } from "../models/User.js";

const router = Router();

// All routes require authentication and APPLICANT or INSPECTOR role
router.use(authenticateToken, authorizeRoles(UserRole.APPLICANT, UserRole.INSPECTOR));

/**
 * @route   POST /api/applications/:id/documents/:documentId/validate
 * @desc    Trigger validation for an uploaded document
 * @access  Private (APPLICANT, INSPECTOR)
 */
router.post("/:id/documents/:documentId/validate", validateDocument);

/**
 * @route   POST /api/applications/:id/documents/:documentId/revalidate
 * @desc    Re-run validation for an uploaded document
 * @access  Private (APPLICANT, INSPECTOR)
 */
router.post("/:id/documents/:documentId/revalidate", revalidateDocument);

/**
 * @route   GET /api/applications/:id/documents/:documentId/validation
 * @desc    Get the latest validation result for a document
 * @access  Private (APPLICANT, INSPECTOR)
 */
router.get("/:id/documents/:documentId/validation", getValidation);

/**
 * @route   GET /api/applications/:id/documents/:documentId/validation/history
 * @desc    Get validation history for a document
 * @access  Private (APPLICANT, INSPECTOR)
 */
router.get("/:id/documents/:documentId/validation/history", getValidationHistory);

export default router;