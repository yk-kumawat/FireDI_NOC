import mongoose, { Schema, Document } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum ApplicationStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
}

export enum BuildingStatus {
  NEW = "NEW",
  EXISTING = "EXISTING",
}

export enum OccupancyCategory {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
  INDUSTRIAL = "INDUSTRIAL",
}

// ─── Nested Interfaces ────────────────────────────────────────────────────────
interface IApplicantDetails {
  name: string;
  email: string;
  phone: string;
}

interface IArchitectDetails {
  name: string;
  registrationNumber?: string;
  email: string;
  phone: string;
}

interface IBuildingLocation {
  address: string;
  state: string;
  district: string;
  pincode: string;
}

interface IBuildingDetails {
  buildingName?: string;
  buildingType?: string;
  buildingStatus?: BuildingStatus;
  occupancyCategory?: OccupancyCategory;
  location?: IBuildingLocation;
  hasHazardousMaterials?: boolean;
  hazardousMaterialsDescription?: string;
  isHighRise?: boolean;
  buildingHeight?: number;
  numberOfFloors?: number;
  builtUpArea?: number;
  builtUpAreaUnit?: string;
}

// ─── Main Document Interface ──────────────────────────────────────────────────
export interface IApplication extends Document {
  applicationId: string;
  applicantId: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  applicantDetails: IApplicantDetails;
  buildingDetails: IBuildingDetails;
  architectDetails?: IArchitectDetails;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const applicantDetailsSchema = new Schema<IApplicantDetails>(
  {
    name: { type: String, required: false, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    phone: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const locationSchema = new Schema<IBuildingLocation>(
  {
    address: { type: String, required: false, trim: true },
    state: { type: String, required: false, trim: true },
    district: { type: String, required: false, trim: true },
    pincode: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const buildingDetailsSchema = new Schema<IBuildingDetails>(
  {
    buildingName: { type: String, required: false, trim: true },
    buildingType: { type: String, required: false, trim: true },
    buildingStatus: {
      type: String,
      enum: Object.values(BuildingStatus),
      required: false,
    },
    occupancyCategory: {
      type: String,
      enum: Object.values(OccupancyCategory),
      required: false,
    },
    location: { type: locationSchema, required: false },
    hasHazardousMaterials: { type: Boolean, required: false },
    hazardousMaterialsDescription: { type: String, required: false, trim: true },
    isHighRise: { type: Boolean, required: false },
    buildingHeight: { type: Number, required: false },
    numberOfFloors: { type: Number, required: false },
    builtUpArea: { type: Number, required: false },
    builtUpAreaUnit: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const architectDetailsSchema = new Schema<IArchitectDetails>(
  {
    name: { type: String, required: false, trim: true },
    registrationNumber: { type: String, required: false, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    phone: { type: String, required: false, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────
const applicationSchema = new Schema<IApplication>(
  {
    applicationId: {
      type: String,
      required: true,
      trim: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.DRAFT,
      required: true,
    },
    applicantDetails: {
      type: applicantDetailsSchema,
      required: false,
      default: () => ({}),
    },
    buildingDetails: {
      type: buildingDetailsSchema,
      required: false,
      default: () => ({}),
    },
    architectDetails: {
      type: architectDetailsSchema,
      required: false,
    },
    submittedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
applicationSchema.index({ applicationId: 1 }, { unique: true });
applicationSchema.index({ applicantId: 1, createdAt: -1 });
applicationSchema.index({ applicantId: 1, status: 1 });

const Application = mongoose.model<IApplication>("Application", applicationSchema);

export default Application;
