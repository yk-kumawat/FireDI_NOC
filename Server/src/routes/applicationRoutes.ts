import { Router } from "express";
import { body } from "express-validator";
import {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  submitApplication,
} from "../controllers/applicationController.js";
import {
  generateChecklist,
  getChecklist,
  updateChecklistItem,
} from "../controllers/checklistController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { UserRole } from "../models/User.js";

const router = Router();

// All routes require a valid JWT and APPLICANT role
router.use(authenticateToken, authorizeRoles(UserRole.APPLICANT));

/**
 * @route   POST /api/applications
 * @desc    Create a new draft application
 * @access  Private (APPLICANT)
 */
router.post("/", createApplication);

/**
 * @route   GET /api/applications
 * @desc    List applications for the authenticated user
 * @access  Private (APPLICANT)
 */
router.get("/", listApplications);

/**
 * @route   GET /api/applications/:id
 * @desc    Get a single application by _id or applicationId
 * @access  Private (APPLICANT)
 */
router.get("/:id", getApplication);

/**
 * @route   PUT /api/applications/:id
 * @desc    Update a draft application
 * @access  Private (APPLICANT)
 */
router.put(
  "/:id",
  [
    // Sanitize nested string fields – only trim, don't enforce presence (drafts are partial)
    body("applicantDetails.name").optional().trim(),
    body("applicantDetails.email").optional().trim().toLowerCase(),
    body("applicantDetails.phone").optional().trim(),

    body("buildingDetails.buildingName").optional().trim(),
    body("buildingDetails.buildingType").optional().trim(),
    body("buildingDetails.buildingStatus").optional().trim(),
    body("buildingDetails.occupancyCategory").optional().trim(),
    body("buildingDetails.location.address").optional().trim(),
    body("buildingDetails.location.state").optional().trim(),
    body("buildingDetails.location.district").optional().trim(),
    body("buildingDetails.location.pincode").optional().trim(),
    body("buildingDetails.hazardousMaterialsDescription").optional().trim(),
    body("buildingDetails.builtUpAreaUnit").optional().trim(),

    body("architectDetails.name").optional().trim(),
    body("architectDetails.registrationNumber").optional().trim(),
    body("architectDetails.email").optional().trim().toLowerCase(),
    body("architectDetails.phone").optional().trim(),
  ],
  updateApplication
);

/**
 * @route   POST /api/applications/:id/submit
 * @desc    Submit a draft application (triggers full validation)
 * @access  Private (APPLICANT)
 */
router.post("/:id/submit", submitApplication);

/**
 * @route   POST /api/applications/:id/checklist/generate
 * @desc    Generate or refresh dynamic NOC checklist
 * @access  Private (APPLICANT)
 */
router.post("/:id/checklist/generate", generateChecklist);

/**
 * @route   GET /api/applications/:id/checklist
 * @desc    Retrieve checklist for an application
 * @access  Private (APPLICANT)
 */
router.get("/:id/checklist", getChecklist);

/**
 * @route   PATCH /api/applications/:id/checklist/items/:requirementId
 * @desc    Update requirement item response (e.g. raw materials / finished goods)
 * @access  Private (APPLICANT)
 */
router.patch("/:id/checklist/items/:requirementId", updateChecklistItem);

export default router;
