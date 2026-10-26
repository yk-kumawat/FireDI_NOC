import type {
  Application,
  ApplicationsListResponse,
  ApplicationStatus,
} from '../types/application';

const BASE_URL = 'http://localhost:5000';

const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

/** Parse error body and throw with message + optional errors array */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const json = await res.json();
    return json.data as T;
  }

  let body: { message?: string; errors?: { field: string; message: string }[] } = {};
  try {
    body = await res.json();
  } catch {
    // ignore parse error
  }

  const err: Error & { errors?: { field: string; message: string }[] } = new Error(
    body.message || `Request failed with status ${res.status}`
  );
  if (body.errors) {
    err.errors = body.errors;
  }
  throw err;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Create a new draft application */
export async function createApplication(token: string): Promise<{ application: Application }> {
  const res = await fetch(`${BASE_URL}/api/applications`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ application: Application }>(res);
}

/** List applications with optional pagination + status filter */
export async function listApplications(
  token: string,
  params?: { page?: number; limit?: number; status?: ApplicationStatus | '' }
): Promise<ApplicationsListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);

  const url = `${BASE_URL}/api/applications${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders(token) });
  return handleResponse<ApplicationsListResponse>(res);
}

/** Get a single application by _id or applicationId */
export async function getApplication(
  token: string,
  id: string
): Promise<{ application: Application }> {
  const res = await fetch(`${BASE_URL}/api/applications/${id}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ application: Application }>(res);
}

/** Update a draft application's fields */
export async function updateApplication(
  token: string,
  id: string,
  data: Partial<Pick<Application, 'applicantDetails' | 'buildingDetails' | 'architectDetails'>>
): Promise<{ application: Application }> {
  const res = await fetch(`${BASE_URL}/api/applications/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<{ application: Application }>(res);
}

/** Submit a draft application */
export async function submitApplication(
  token: string,
  id: string
): Promise<{ application: Application }> {
  const res = await fetch(`${BASE_URL}/api/applications/${id}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ application: Application }>(res);
}
