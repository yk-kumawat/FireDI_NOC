import { Response, NextFunction } from "express";
import { AuthRequest } from "./authController.js";
import {
  ChecklistService,
  ChecklistServiceError,
} from "../services/checklistService.js";

/**
 * @route   POST /api/applications/:id/checklist/generate
 * @desc    Generate or refresh dynamic checklist for an application
 * @access  Private (APPLICANT)
 */
export const generateChecklist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = req.params.id;

    const checklist = await ChecklistService.generateOrRefreshChecklist(
      applicationId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Checklist generated successfully",
      data: {
        checklist,
        ruleSetVersion: checklist.ruleSetVersion,
      },
    });
  } catch (error: any) {
    if (error instanceof ChecklistServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    console.error("generateChecklist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate checklist",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/applications/:id/checklist
 * @desc    Retrieve persisted checklist for an application
 * @access  Private (APPLICANT)
 */
export const getChecklist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = req.params.id;

    const checklist = await ChecklistService.getChecklist(applicationId, userId);

    if (!checklist) {
      res.status(200).json({
        success: true,
        data: {
          checklist: null,
          message: "Checklist has not been generated for this application yet",
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        checklist,
      },
    });
  } catch (error: any) {
    if (error instanceof ChecklistServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    console.error("getChecklist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch checklist",
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/applications/:id/checklist/items/:requirementId
 * @desc    Update applicant's response for a checklist requirement item
 * @access  Private (APPLICANT)
 */
export const updateChecklistItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id, requirementId } = req.params;

    const checklist = await ChecklistService.updateRequirementResponse(
      id,
      requirementId as string,
      userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Checklist item response updated successfully",
      data: {
        checklist,
      },
    });
  } catch (error: any) {
    if (error instanceof ChecklistServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    console.error("updateChecklistItem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update checklist item",
      error: error.message,
    });
  }
};
