import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import { AuthRequest } from "./authController.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import User from "../models/User.js";
import { generateApplicationId } from "../utils/applicationId.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine how to query by the :id param – either by MongoDB _id or
 * by the human-readable applicationId field (FNO-YYYY-XXXXXXXX).
 */
const buildIdQuery = (id: string | string[]) => {
  const singleId = Array.isArray(id) ? id[0] : id;
  if (mongoose.Types.ObjectId.isValid(singleId) && String(new mongoose.Types.ObjectId(singleId)) === singleId) {
    return { _id: singleId };
  }
  return { applicationId: singleId };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @route   POST /api/applications
 * @desc    Create a new draft application
 * @access  Private (APPLICANT)
 */
export const createApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Fetch user to pre-populate applicantDetails
    const user = await User.findById(userId).select("name email phone");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Retry loop to handle applicationId collisions (up to 5 attempts)
    let application;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const applicationId = generateApplicationId();
        application = await Application.create({
          applicationId,
          applicantId: userId,
          status: ApplicationStatus.DRAFT,
          applicantDetails: {
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          buildingDetails: {},
        });
        break; // success
      } catch (err: any) {
        // 11000 = duplicate key error
        if (err.code === 11000 && attempt < 4) {
          continue;
        }
        throw err;
      }
    }

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: { application },
    });
  } catch (error: any) {
    console.error("createApplication error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create application",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/applications
 * @desc    List applications belonging to the current user with pagination/filtering
 * @access  Private (APPLICANT)
 */
export const listApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Pagination
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "10"), 10)));
    const skip = (page - 1) * limit;

    // Base filter — always scoped to the requesting user
    const filter: Record<string, unknown> = { applicantId: userId };

    // Optional status filter
    const statusParam = req.query.status as string | undefined;
    if (statusParam) {
      if (!Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid status value. Must be one of: ${Object.values(ApplicationStatus).join(", ")}`,
        });
        return;
      }
      filter.status = statusParam;
    }

    const [applications, total] = await Promise.all([
      Application.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Application.countDocuments(filter),
    ]);

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
      },
    });
  } catch (error: any) {
    console.error("listApplications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/applications/:id
 * @desc    Get a single application (owner only)
 * @access  Private (APPLICANT)
 */
export const getApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const query = buildIdQuery(req.params.id);

    const application = await Application.findOne(query);
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (application.applicantId.toString() !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (error: any) {
    console.error("getApplication error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application",
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/applications/:id
 * @desc    Update a draft application (owner only)
 * @access  Private (APPLICANT)
 */
export const updateApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check express-validator errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user!.userId;
    const query = buildIdQuery(req.params.id);

    const application = await Application.findOne(query);
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (application.applicantId.toString() !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      res.status(403).json({
        success: false,
        message: "Only draft applications can be edited",
      });
      return;
    }

    // Allowlist — never allow sensitive fields to be overwritten from body
    const allowedFields = ["applicantDetails", "buildingDetails", "architectDetails"] as const;
    const updatePayload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updatePayload[field] = req.body[field];
      }
    }

    const updated = await Application.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { returnDocument: "after", runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: { application: updated },
    });
  } catch (error: any) {
    console.error("updateApplication error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update application",
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/applications/:id/submit
 * @desc    Submit a draft application after full server-side validation
 * @access  Private (APPLICANT)
 */
export const submitApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const query = buildIdQuery(req.params.id);

    const application = await Application.findOne(query);
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (application.applicantId.toString() !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      res.status(409).json({
        success: false,
        message: "Application has already been submitted",
      });
      return;
    }

    // ── Full server-side validation ──────────────────────────────────────────
    const validationErrors: { field: string; message: string }[] = [];

    const ad = application.applicantDetails as any;
    const bd = application.buildingDetails as any;
    const arc = application.architectDetails as any;
    const loc = bd?.location as any;

    // Applicant details
    if (!ad?.name?.trim()) validationErrors.push({ field: "applicantDetails.name", message: "Applicant name is required" });
    if (!ad?.email?.trim()) validationErrors.push({ field: "applicantDetails.email", message: "Applicant email is required" });
    if (!ad?.phone?.trim()) validationErrors.push({ field: "applicantDetails.phone", message: "Applicant phone is required" });

    // Building details – basic
    if (!bd?.buildingName?.trim()) validationErrors.push({ field: "buildingDetails.buildingName", message: "Building name is required" });
    if (!bd?.buildingType?.trim()) validationErrors.push({ field: "buildingDetails.buildingType", message: "Building type is required" });
    if (!bd?.buildingStatus) validationErrors.push({ field: "buildingDetails.buildingStatus", message: "Building status is required" });
    if (!bd?.occupancyCategory) validationErrors.push({ field: "buildingDetails.occupancyCategory", message: "Occupancy category is required" });

    // Location
    if (!loc?.address?.trim()) validationErrors.push({ field: "buildingDetails.location.address", message: "Address is required" });
    if (!loc?.state?.trim()) validationErrors.push({ field: "buildingDetails.location.state", message: "State is required" });
    if (!loc?.district?.trim()) validationErrors.push({ field: "buildingDetails.location.district", message: "District is required" });
    if (!loc?.pincode?.trim()) validationErrors.push({ field: "buildingDetails.location.pincode", message: "Pincode is required" });

    // Building metrics
    if (bd?.numberOfFloors == null) {
      validationErrors.push({ field: "buildingDetails.numberOfFloors", message: "Number of floors is required" });
    } else if (Number(bd.numberOfFloors) < 1) {
      validationErrors.push({ field: "buildingDetails.numberOfFloors", message: "Number of floors must be at least 1" });
    }

    if (bd?.builtUpArea == null) {
      validationErrors.push({ field: "buildingDetails.builtUpArea", message: "Built-up area is required" });
    } else if (Number(bd.builtUpArea) <= 0) {
      validationErrors.push({ field: "buildingDetails.builtUpArea", message: "Built-up area must be greater than 0" });
    }

    if (!bd?.builtUpAreaUnit?.trim()) validationErrors.push({ field: "buildingDetails.builtUpAreaUnit", message: "Built-up area unit is required" });

    // Conditional validations
    if (bd?.hasHazardousMaterials === true && !bd?.hazardousMaterialsDescription?.trim()) {
      validationErrors.push({
        field: "buildingDetails.hazardousMaterialsDescription",
        message: "Description of hazardous materials is required",
      });
    }

    if (bd?.isHighRise === true) {
      if (bd?.buildingHeight == null) {
        validationErrors.push({ field: "buildingDetails.buildingHeight", message: "Building height is required for high-rise buildings" });
      } else if (Number(bd.buildingHeight) <= 0) {
        validationErrors.push({ field: "buildingDetails.buildingHeight", message: "Building height must be greater than 0" });
      }
    }

    // Architect details
    if (!arc?.name?.trim()) validationErrors.push({ field: "architectDetails.name", message: "Architect name is required" });
    if (!arc?.email?.trim()) validationErrors.push({ field: "architectDetails.email", message: "Architect email is required" });
    if (!arc?.phone?.trim()) validationErrors.push({ field: "architectDetails.phone", message: "Architect phone is required" });

    if (validationErrors.length > 0) {
      res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
      return;
    }

    // ── Atomic status update (handles race conditions) ────────────────────────
    const updated = await Application.findOneAndUpdate(
      { ...query, status: ApplicationStatus.DRAFT },
      { $set: { status: ApplicationStatus.SUBMITTED, submittedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updated) {
      res.status(409).json({
        success: false,
        message: "Application has already been submitted",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      data: { application: updated },
    });
  } catch (error: any) {
    console.error("submitApplication error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error.message,
    });
  }
};
