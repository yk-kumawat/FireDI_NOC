import type {
  DocumentReview,
  ReviewFinding,
  ReviewStatus,
  Document,
  DocumentVerificationStatus,
  ValidationOverallStatus,
} from "../types/checklist";
import type { Application, PaginationMeta } from "../types/application";

const BASE_URL = "http://localhost:5000";

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export interface InspectorApplicationsResponse {
  applications: Application[];
  pagination: PaginationMeta;
  stats: {
    total: number;
    SUBMITTED: number;
    UNDER_REVIEW: number;
    DRAFT: number;
  };
}

/**
 * List applications for inspector review with optional pagination, status filter, search
 */
export async function listInspectorApplications(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }
): Promise<InspectorApplicationsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);

  const url = `${BASE_URL}/api/inspector/applications${query.toString() ? "?" + query.toString() : ""}`;
  const res = await fetch(url, { headers: getAuthHeaders(token) });
  return handleResponse<InspectorApplicationsResponse>(res);
}

/**
 * Get signed download URL for an inspector reviewing a document
 */
export async function getInspectorDocumentDownloadUrl(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}/download`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ downloadUrl: string; expiresIn: number }>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const json = await res.json();
    return json.data as T;
  }

  let body: { message?: string; errors?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    // ignore parse error
  }

  const err: Error & { errors?: unknown } = new Error(
    body.message || `Request failed with status ${res.status}`
  );
  if (body.errors) {
    err.errors = body.errors;
  }
  throw err;
}

/**
 * Get review summary for all documents in an application (inspector view)
 */
export async function getApplicationReviewSummary(
  token: string,
  applicationId: string
): Promise<{
  applicationId: string;
  applicationNumber: string;
  applicantName: string;
  stats: {
    totalRequired: number;
    uploaded: number;
    pendingReview: number;
    verified: number;
    rejected: number;
    notUploaded: number;
    validationPassed: number;
    validationMismatch: number;
    validationNeedsReview: number;
  };
  documents: Array<{
    documentId: string;
    requirementId: string;
    requirementName: string;
    required: boolean;
    originalFilename: string;
    verificationStatus: DocumentVerificationStatus;
    validationStatus: ValidationOverallStatus | "not_validated";
    validationFindingsCount: number;
    reviewStatus: ReviewStatus;
    reviewCompletedAt?: string;
    hasValidationErrors: boolean;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/api/inspector/applications/${applicationId}/review-summary`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(res);
}

/**
 * Get full document details for inspector review
 */
export async function getDocumentForInspector(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{
  document: Document;
}> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse(res);
}

/**
 * Start reviewing a document
 */
export async function startDocumentReview(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ review: DocumentReview }> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}/review/start`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ review: DocumentReview }>(res);
}

/**
 * Complete document review with findings
 */
export async function completeDocumentReview(
  token: string,
  applicationId: string,
  documentId: string,
  data: {
    status: ReviewStatus;
    overallNote?: string;
    findings: Array<{
      findingId: string;
      status: ReviewStatus;
      note?: string;
    }>;
  }
): Promise<{ review: DocumentReview }> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}/review/complete`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    }
  );
  return handleResponse<{ review: DocumentReview }>(res);
}

/**
 * Update review status for a specific finding
 */
export async function updateFindingReview(
  token: string,
  applicationId: string,
  documentId: string,
  findingId: string,
  data: { status: ReviewStatus; note?: string }
): Promise<{ review: DocumentReview }> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}/review/findings/${findingId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    }
  );
  return handleResponse<{ review: DocumentReview }>(res);
}

/**
 * Get document review status
 */
export async function getDocumentReview(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ review: DocumentReview | null }> {
  const res = await fetch(
    `${BASE_URL}/api/inspector/applications/${applicationId}/documents/${documentId}/review`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ review: DocumentReview | null }>(res);
}

// Re-export types
export type {
  DocumentReview,
  ReviewFinding,
  ReviewStatus,
  DocumentVerificationStatus,
  ValidationOverallStatus,
  Document,
};