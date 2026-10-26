import mongoose from "mongoose";
import Application, { ApplicationStatus } from "../models/Application.js";
import Checklist, {
  IChecklist,
  IChecklistItem,
  IChecklistItemResponse,
  ChecklistItemStatus,
  ChecklistStatus,
} from "../models/Checklist.js";
import {
  evaluateApplicationRules,
  ACTIVE_RULESET_VERSION,
} from "../rules/ruleSet.js";

export class ChecklistServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ChecklistServiceError";
    this.statusCode = statusCode;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildAppQuery = (id: string | string[]) => {
  const singleId = Array.isArray(id) ? id[0] : id;
  if (mongoose.Types.ObjectId.isValid(singleId) && String(new mongoose.Types.ObjectId(singleId)) === singleId) {
    return { _id: singleId };
  }
  return { applicationId: singleId };
};

export class ChecklistService {
  /**
   * Generates or refreshes a checklist for a given application.
   * Deterministically evaluates rules, deduplicates items, and preserves
   * any existing applicant responses for still-applicable requirements.
   */
  static async generateOrRefreshChecklist(
    applicationRef: string | string[],
    applicantId: string
  ): Promise<IChecklist> {
    const query = buildAppQuery(applicationRef);
    const application = await Application.findOne(query);

    if (!application) {
      throw new ChecklistServiceError("Application not found", 404);
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ChecklistServiceError("Access denied", 403);
    }

    // Existing checklist if any
    const existingChecklist = await Checklist.findOne({
      applicationId: application._id,
    });

    // If application is submitted/under review and already has a checklist,
    // regeneration is locked.
    if (
      application.status !== ApplicationStatus.DRAFT &&
      existingChecklist
    ) {
      throw new ChecklistServiceError(
        "Checklist cannot be regenerated for submitted applications",
        403
      );
    }

    // Evaluate rules deterministically
    const evaluation = evaluateApplicationRules(application);

    // Map existing items by requirementId for response preservation
    const existingItemMap = new Map<string, IChecklistItem>();
    if (existingChecklist && existingChecklist.items) {
      for (const item of existingChecklist.items) {
        existingItemMap.set(item.requirementId, item);
      }
    }

    // Build the consolidated new checklist items list
    const consolidatedItems: IChecklistItem[] = evaluation.requirements.map(
      ({ requirement, ruleReferences, applicableReason }) => {
        const existing = existingItemMap.get(requirement.id);

        if (existing) {
          // Preserve applicant responses and status for still-applicable requirements
          return {
            requirementId: requirement.id,
            name: requirement.name,
            description: requirement.description,
            category: requirement.category,
            type: requirement.type,
            required: requirement.required,
            status: existing.status,
            ruleReferences,
            applicableReason,
            sourceReference: requirement.sourceReference,
            response: existing.response,
            completedAt: existing.completedAt,
          };
        }

        // New requirement
        return {
          requirementId: requirement.id,
          name: requirement.name,
          description: requirement.description,
          category: requirement.category,
          type: requirement.type,
          required: requirement.required,
          status: ChecklistItemStatus.PENDING,
          ruleReferences,
          applicableReason,
          sourceReference: requirement.sourceReference,
          response: undefined,
          completedAt: undefined,
        };
      }
    );

    // Calculate overall status
    const allRequiredCompleted =
      consolidatedItems.length > 0 &&
      consolidatedItems
        .filter((item) => item.required)
        .every((item) => item.status === ChecklistItemStatus.COMPLETED);

    const checklistStatus = allRequiredCompleted
      ? ChecklistStatus.COMPLETED
      : ChecklistStatus.PENDING;

    // Upsert atomically
    const checklist = await Checklist.findOneAndUpdate(
      { applicationId: application._id },
      {
        $set: {
          applicantId: application.applicantId,
          ruleSetVersion: ACTIVE_RULESET_VERSION,
          status: checklistStatus,
          items: consolidatedItems,
          generatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return checklist!;
  }

  /**
   * Retrieves the checklist for an application.
   */
  static async getChecklist(
    applicationRef: string | string[],
    applicantId: string
  ): Promise<IChecklist | null> {
    const query = buildAppQuery(applicationRef);
    const application = await Application.findOne(query);

    if (!application) {
      throw new ChecklistServiceError("Application not found", 404);
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ChecklistServiceError("Access denied", 403);
    }

    const checklist = await Checklist.findOne({
      applicationId: application._id,
    });

    return checklist;
  }

  /**
   * Updates an applicant's response for a specific information requirement item.
   * Only permitted while the application is in DRAFT status.
   */
  static async updateRequirementResponse(
    applicationRef: string | string[],
    requirementId: string,
    applicantId: string,
    responsePayload: IChecklistItemResponse
  ): Promise<IChecklist> {
    const query = buildAppQuery(applicationRef);
    const application = await Application.findOne(query);

    if (!application) {
      throw new ChecklistServiceError("Application not found", 404);
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ChecklistServiceError("Access denied", 403);
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ChecklistServiceError(
        "Checklist items cannot be updated on submitted applications",
        403
      );
    }

    const checklist = await Checklist.findOne({
      applicationId: application._id,
    });

    if (!checklist) {
      throw new ChecklistServiceError("Checklist has not been generated yet", 404);
    }

    const itemIndex = checklist.items.findIndex(
      (item) => item.requirementId === requirementId
    );

    if (itemIndex === -1) {
      throw new ChecklistServiceError(
        `Requirement '${requirementId}' does not exist in this checklist`,
        404
      );
    }

    const item = checklist.items[itemIndex];

    // Response validation based on requirement ID
    if (requirementId === "REQ_RAW_MATERIALS") {
      if (
        !responsePayload.materials ||
        !Array.isArray(responsePayload.materials) ||
        responsePayload.materials.length === 0
      ) {
        throw new ChecklistServiceError(
          "At least one raw material entry with name, quantity, unit, and storage location is required",
          422
        );
      }

      for (const m of responsePayload.materials) {
        if (!m.name?.trim()) {
          throw new ChecklistServiceError("Raw material name is required", 422);
        }
        if (m.quantity == null || Number(m.quantity) < 0) {
          throw new ChecklistServiceError("Raw material quantity must be a non-negative number", 422);
        }
        if (!m.unit?.trim()) {
          throw new ChecklistServiceError("Raw material unit is required", 422);
        }
        if (!m.storageLocation?.trim()) {
          throw new ChecklistServiceError("Raw material storage location is required", 422);
        }
      }
    } else if (requirementId === "REQ_FINISHED_GOODS") {
      if (
        !responsePayload.goods ||
        !Array.isArray(responsePayload.goods) ||
        responsePayload.goods.length === 0
      ) {
        throw new ChecklistServiceError(
          "At least one finished good entry with name, quantity, unit, and storage location is required",
          422
        );
      }

      for (const g of responsePayload.goods) {
        if (!g.name?.trim()) {
          throw new ChecklistServiceError("Finished good name is required", 422);
        }
        if (g.quantity == null || Number(g.quantity) < 0) {
          throw new ChecklistServiceError("Finished good quantity must be a non-negative number", 422);
        }
        if (!g.unit?.trim()) {
          throw new ChecklistServiceError("Finished good unit is required", 422);
        }
        if (!g.storageLocation?.trim()) {
          throw new ChecklistServiceError("Finished good storage location is required", 422);
        }
      }
    }

    // Update item
    item.response = responsePayload;
    item.status = ChecklistItemStatus.COMPLETED;
    item.completedAt = new Date();

    // Recompute overall checklist status
    const allRequiredCompleted = checklist.items
      .filter((it) => it.required)
      .every((it) => it.status === ChecklistItemStatus.COMPLETED);

    checklist.status = allRequiredCompleted
      ? ChecklistStatus.COMPLETED
      : ChecklistStatus.PENDING;

    await checklist.save();
    return checklist;
  }
}
