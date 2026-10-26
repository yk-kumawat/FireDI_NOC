import type {
  DocumentReview,
  ReviewFinding,
  ReviewStatus,
  Document,
  DocumentVerificationStatus,
  ValidationOverallStatus,
} from "../types/checklist";

const BASE_URL = "http://localhost:5000";

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

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