// ─── Enums ────────────────────────────────────────────────────────────────────
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW';
export type BuildingStatus = 'NEW' | 'EXISTING';
export type OccupancyCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL';

// ─── Nested Types ─────────────────────────────────────────────────────────────
export interface ApplicantDetails {
  name: string;
  email: string;
  phone: string;
}

export interface BuildingLocation {
  address: string;
  state: string;
  district: string;
  pincode: string;
}

export interface BuildingDetails {
  buildingName?: string;
  buildingType?: string;
  buildingStatus?: BuildingStatus;
  occupancyCategory?: OccupancyCategory;
  location?: Partial<BuildingLocation>;
  hasHazardousMaterials?: boolean;
  hazardousMaterialsDescription?: string;
  isHighRise?: boolean;
  buildingHeight?: number;
  numberOfFloors?: number;
  builtUpArea?: number;
  builtUpAreaUnit?: string;
}

export interface ArchitectDetails {
  name?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
}

// ─── Main Type ────────────────────────────────────────────────────────────────
export interface Application {
  _id: string;
  applicationId: string;
  applicantId: string;
  status: ApplicationStatus;
  applicantDetails: ApplicantDetails;
  buildingDetails: BuildingDetails;
  architectDetails?: ArchitectDetails;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApplicationsListResponse {
  applications: Application[];
  pagination: PaginationMeta;
}
