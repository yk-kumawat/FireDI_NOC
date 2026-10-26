import mongoose, { Schema, Document } from "mongoose";
import { RequirementCategory, RequirementType } from "../rules/types.js";

export enum ChecklistItemStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

export enum ChecklistStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

export interface IRawMaterialItem {
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
}

export interface IFinishedGoodsItem {
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
}

export interface IChecklistItemResponse {
  materials?: IRawMaterialItem[];
  goods?: IFinishedGoodsItem[];
  notes?: string;
}

export interface IChecklistItem {
  requirementId: string;
  name: string;
  description: string;
  category: RequirementCategory;
  type: RequirementType;
  required: boolean;
  status: ChecklistItemStatus;
  ruleReferences: string[];
  applicableReason: string;
  sourceReference: string;
  response?: IChecklistItemResponse;
  completedAt?: Date;
}

export interface IChecklist extends Document {
  applicationId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  ruleSetVersion: string;
  status: ChecklistStatus;
  items: IChecklistItem[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const rawMaterialItemSchema = new Schema<IRawMaterialItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    storageLocation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const finishedGoodsItemSchema = new Schema<IFinishedGoodsItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    storageLocation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const checklistItemResponseSchema = new Schema<IChecklistItemResponse>(
  {
    materials: { type: [rawMaterialItemSchema], default: undefined },
    goods: { type: [finishedGoodsItemSchema], default: undefined },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    requirementId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "COMMON",
        "INDUSTRIAL",
        "EXISTING_BUILDING",
        "HAZARDOUS_MATERIALS",
        "BUILDING_SAFETY",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: ["DOCUMENT", "INFORMATION"],
    },
    required: { type: Boolean, required: true, default: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(ChecklistItemStatus),
      default: ChecklistItemStatus.PENDING,
    },
    ruleReferences: [{ type: String, required: true }],
    applicableReason: { type: String, required: true, trim: true },
    sourceReference: { type: String, required: true, trim: true },
    response: { type: checklistItemResponseSchema, default: undefined },
    completedAt: { type: Date },
  },
  { _id: false }
);

// ─── Main Checklist Schema ───────────────────────────────────────────────────
const checklistSchema = new Schema<IChecklist>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ruleSetVersion: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    status: {
      type: String,
      enum: Object.values(ChecklistStatus),
      default: ChecklistStatus.PENDING,
      required: true,
    },
    items: {
      type: [checklistItemSchema],
      default: [],
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
checklistSchema.index({ applicantId: 1, applicationId: 1 });

const Checklist = mongoose.model<IChecklist>("Checklist", checklistSchema);

export default Checklist;
