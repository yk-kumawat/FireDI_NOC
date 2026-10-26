import type { Document, TextExtractionResult } from "../types/checklist";

const BASE_URL = "http://localhost:5000";

const getAuthHeaders = (token: string) => ({
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
 * Upload a document for a checklist requirement.
 * Uses multipart/form-data for file upload.
 */
export async function uploadDocument(
  token: string,
  applicationId: string,
  requirementId: string,
  file: File
): Promise<{ document: Document }> {
  const formData = new FormData();
  formData.append("document", file);

  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/checklist/items/${requirementId}/documents`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: formData,
    }
  );

  return handleResponse<{ document: Document }>(res);
}

/**
 * List documents for a checklist requirement.
 */
export async function listDocuments(
  token: string,
  applicationId: string,
  requirementId: string
): Promise<{ documents: Document[] }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/checklist/items/${requirementId}/documents`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ documents: Document[] }>(res);
}

/**
 * Get document metadata.
 */
export async function getDocument(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ document: Document }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ document: Document }>(res);
}

/**
 * Get signed download URL for a document.
 */
export async function getDocumentDownloadUrl(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/download`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ downloadUrl: string; expiresIn: number }>(res);
}

/**
 * Replace a document (creates new version).
 */
export async function replaceDocument(
  token: string,
  applicationId: string,
  documentId: string,
  file: File
): Promise<{ document: Document }> {
  const formData = new FormData();
  formData.append("document", file);

  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: formData,
    }
  );
  return handleResponse<{ document: Document }>(res);
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  token: string,
  applicationId: string,
  documentId: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );

  if (!res.ok) {
    let body: { message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
}

/**
 * Start or retry text extraction for a document.
 */
export async function extractText(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ extraction: TextExtractionResult }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/extract-text`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ extraction: TextExtractionResult }>(res);
}

/**
 * Get text extraction result for a document.
 */
export async function getExtraction(
  token: string,
  applicationId: string,
  documentId: string
): Promise<{ extraction: TextExtractionResult }> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/documents/${documentId}/extraction`,
    {
      headers: getAuthHeaders(token),
    }
  );
  return handleResponse<{ extraction: TextExtractionResult }>(res);
}