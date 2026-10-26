import { Response, NextFunction } from "express";
import { AuthRequest } from "./authController.js";
import { getValidationService } from "../services/validationService.js";
import { ValidationServiceError } from "../services/validationService.js";
import { UserRole } from "../models/User.js";

// Helper to extract single value from params
const getParam = (param: string | string[]): string => (Array.isArray(param) ? param[0] : param);

/**
 * @route   POST /api/applications/:id/documents/:documentId/validate
 * @desc    Trigger validation for an uploaded document
 * @access  Private (APPLICANT, INSPECTOR)
 */
export const validateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role as UserRole;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const validationService = getValidationService();
    const result = await validationService.validateDocument({
      applicationId,
      documentId,
      applicantId: userId,
      userRole,
    });

    res.status(200).json({
      success: true,
      message: "Document validation completed",
      data: { validation: result },
    });
  } catch (error: any) {
    if (error instanceof ValidationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("validateDocument error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate document",
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/applications/:id/documents/:documentId/revalidate
 * @desc    Re-run validation for an uploaded document (creates new version)
 * @access  Private (APPLICANT, INSPECTOR)
 */
export const revalidateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role as UserRole;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const validationService = getValidationService();
    const result = await validationService.revalidateDocument({
      applicationId,
      documentId,
      applicantId: userId,
      userRole,
    });

    res.status(200).json({
      success: true,
      message: "Document revalidation completed",
      data: { validation: result },
    });
  } catch (error: any) {
    if (error instanceof ValidationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("revalidateDocument error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revalidate document",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/applications/:id/documents/:documentId/validation
 * @desc    Get the latest validation result for a document
 * @access  Private (APPLICANT, INSPECTOR)
 */
export const getValidation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role as UserRole;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const validationService = getValidationService();
    const result = await validationService.getValidationResult(
      applicationId,
      documentId,
      userId,
      userRole
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: "No validation result found for this document",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { validation: result },
    });
  } catch (error: any) {
    if (error instanceof ValidationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getValidation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve validation result",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/applications/:id/documents/:documentId/validation/history
 * @desc    Get validation history for a document
 * @access  Private (APPLICANT, INSPECTOR)
 */
export const getValidationHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role as UserRole;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const validationService = getValidationService();
    const history = await validationService.getValidationHistory(
      applicationId,
      documentId,
      userId,
      userRole
    );

    res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error: any) {
    if (error instanceof ValidationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getValidationHistory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve validation history",
      error: error.message,
    });
  }
};