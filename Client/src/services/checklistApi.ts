import type {
  Checklist,
  ChecklistItemResponse,
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

  let body: { message?: string; errors?: any } = {};
  try {
    body = await res.json();
  } catch {
    // ignore parse error
  }

  const err: Error & { errors?: any } = new Error(
    body.message || `Request failed with status ${res.status}`
  );
  if (body.errors) {
    err.errors = body.errors;
  }
  throw err;
}

/**
 * Fetch persisted checklist for an application.
 */
export async function getChecklist(
  token: string,
  applicationId: string
): Promise<{ checklist: Checklist | null }> {
  const res = await fetch(`${BASE_URL}/api/applications/${applicationId}/checklist`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ checklist: Checklist | null }>(res);
}

/**
 * Generate or refresh dynamic checklist using backend rule evaluation.
 */
export async function generateChecklist(
  token: string,
  applicationId: string
): Promise<{ checklist: Checklist; ruleSetVersion: string }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/checklist/generate`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ checklist: Checklist; ruleSetVersion: string }>(res);
}

/**
 * Submit or update an applicant response for a specific checklist requirement item.
 */
export async function updateChecklistItemResponse(
  token: string,
  applicationId: string,
  requirementId: string,
  response: ChecklistItemResponse
): Promise<{ checklist: Checklist }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/checklist/items/${requirementId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(response),
    }
  );
  return handleResponse<{ checklist: Checklist }>(res);
}
