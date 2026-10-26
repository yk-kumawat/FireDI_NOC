import type {
  DocumentValidationResult,
  ValidationFinding,
  ValidationOverallStatus,
  ValidationFindingStatus,
} from "../types/checklist";

const BASE_URL = "http://localhost:5000";

const getAuthHeaders = (token: string) => ({
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
 * Trigger validation for a document
 */
export async function validateDocument(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ validation: DocumentValidationResult }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/validate`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ validation: DocumentValidationResult }>(res);
}

/**
 * Re-run validation for a document (creates new version)
 */
export async function revalidateDocument(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ validation: DocumentValidationResult }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/revalidate`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ validation: DocumentValidationResult }>(res);
}

/**
 * Get the latest validation result for a document
 */
export async function getValidation(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ validation: DocumentValidationResult }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/validation`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ validation: DocumentValidationResult }>(res);
}

/**
 * Get validation history for a document
 */
export async function getValidationHistory(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ history: DocumentValidationResult[] }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/validation/history`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ history: DocumentValidationResult[] }>(res);
}

// Re-export types for convenience
export type {
  DocumentValidationResult,
  ValidationFinding,
  ValidationOverallStatus,
  ValidationFindingStatus,
};