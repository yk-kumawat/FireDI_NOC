import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import type { Document, TextExtractionResult, TextExtractionStatus, DocumentClassification, DocumentClassificationStatus } from "../../types/checklist";
import {
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  listDocuments,
  extractText,
  getExtraction,
  classifyDocument,
  getClassification,
} from "../../services/documentApi";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  requirementId: string;
  requirementName: string;
  token: string;
  isReadOnly?: boolean;
  existingDocuments?: Document[];
  onUploadSuccess?: (documents: Document[]) => void;
}

export const DocumentUploadModal = ({
  isOpen,
  onClose,
  applicationId,
  requirementId,
  requirementName,
  token,
  isReadOnly = false,
  existingDocuments = [],
  onUploadSuccess,
}: DocumentUploadModalProps) => {
  const [documents, setDocuments] = useState<Document[]>(existingDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [classifyingDocId, setClassifyingDocId] = useState<string | null>(null);
  const [extractionResults, setExtractionResults] = useState<Record<string, TextExtractionResult>>({});
  const [classificationResults, setClassificationResults] = useState<Record<string, DocumentClassification>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token || !applicationId) return;
    setIsLoading(true);
    try {
      const res = await listDocuments(token, applicationId, requirementId);
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [token, applicationId, requirementId]);

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, JPG, and PNG files are allowed");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setError("");
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      const res = await uploadDocument(token, applicationId, requirementId, file);
      setDocuments((prev) => [res.document, ...prev]);
      setSuccessMsg(`"${file.name}" uploaded successfully`);
      setTimeout(() => setSuccessMsg(""), 4000);
      onUploadSuccess?.([res.document, ...documents]);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const res = await getDocumentDownloadUrl(token, applicationId, document._id);
      // Open in new tab for download
      window.open(res.downloadUrl, "_blank");
    } catch (err: any) {
      setError(err.message || "Failed to get download link");
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteDocument(token, applicationId, documentId);
      setDocuments((prev) => prev.filter((d) => d._id !== documentId));
      setSuccessMsg("Document deleted successfully");
      setTimeout(() => setSuccessMsg(""), 4000);
      onUploadSuccess?.(documents.filter((d) => d._id !== documentId));
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractText = async (document: Document) => {
    if (extractingDocId === document._id) return;

    setExtractingDocId(document._id);
    setError("");

    try {
      const res = await extractText(token, applicationId, document._id);
      setExtractionResults((prev) => ({ ...prev, [document._id]: res.extraction }));
      setSuccessMsg("Text extraction started. Check back shortly for results.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to start text extraction");
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleGetExtraction = async (document: Document) => {
    setError("");

    try {
      const res = await getExtraction(token, applicationId, document._id);
      setExtractionResults((prev) => ({ ...prev, [document._id]: res.extraction }));
    } catch (err: any) {
      setError(err.message || "Failed to get extraction result");
    }
  };

  const handleClassifyDocument = async (document: Document) => {
    if (classifyingDocId === document._id) return;

    setClassifyingDocId(document._id);
    setError("");

    try {
      const res = await classifyDocument(token, applicationId, document._id);
      setClassificationResults((prev) => ({ ...prev, [document._id]: res.classification }));
      setSuccessMsg("AI classification started. Check back shortly for results.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to start AI classification");
    } finally {
      setClassifyingDocId(null);
    }
  };

  const handleGetClassification = async (document: Document) => {
    setError("");

    try {
      const res = await getClassification(token, applicationId, document._id);
      setClassificationResults((prev) => ({ ...prev, [document._id]: res.classification }));
    } catch (err: any) {
      setError(err.message || "Failed to get classification result");
    }
  };

  const getClassificationStatusBadge = (status: DocumentClassificationStatus) => {
    const styles: Record<string, string> = {
      NOT_STARTED: "bg-slate-100 text-slate-700",
      QUEUED: "bg-blue-100 text-blue-700",
      PROCESSING: "bg-amber-100 text-amber-700",
      COMPLETED: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${styles[status] || "bg-slate-100 text-slate-700"}`}>
        {status}
      </span>
    );
  };

  const getMatchBadge = (matchesExpected: boolean) => {
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${matchesExpected ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
        {matchesExpected ? "Matches Expected" : "Mismatch"}
      </span>
    );
  };

  const getExtractionStatusBadge = (status: TextExtractionStatus) => {
    const styles: Record<string, string> = {
      NOT_STARTED: "bg-slate-100 text-slate-700",
      QUEUED: "bg-blue-100 text-blue-700",
      PROCESSING: "bg-amber-100 text-amber-700",
      COMPLETED: "bg-green-100 text-green-700",
      PARTIAL: "bg-orange-100 text-orange-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${styles[status] || "bg-slate-100 text-slate-700"}`}>
        {status}
      </span>
    );
  };

  const getMethodBadge = (method: TextExtractionResult["method"]) => {
    const styles: Record<string, string> = {
      EMBEDDED: "bg-blue-100 text-blue-700",
      OCR: "bg-purple-100 text-purple-700",
      MIXED: "bg-indigo-100 text-indigo-700",
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${styles[method] || "bg-slate-100 text-slate-700"}`}>
        {method}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  const getStatusBadge = (status: Document["processingStatus"] | Document["verificationStatus"]) => {
    const styles: Record<string, string> = {
      UPLOADED: "bg-blue-100 text-blue-700",
      PROCESSING: "bg-amber-100 text-amber-700",
      PROCESSED: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
      NOT_STARTED: "bg-slate-100 text-slate-700",
      PENDING_REVIEW: "bg-amber-100 text-amber-700",
      VERIFIED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${styles[status] || "bg-slate-100 text-slate-700"}`}>
        {status}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#b91c1c]/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                  {requirementName}
                </h3>
                <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                  Document Attachments
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-800 flex items-center justify-between">
                <span>{successMsg}</span>
                <button onClick={() => setSuccessMsg("")} className="text-green-600 hover:text-green-900">&times;</button>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">&times;</button>
              </div>
            )}

            {/* Upload Zone */}
            {!isReadOnly && (
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center mb-5 transition-colors ${
                  isUploading
                    ? "border-[#b91c1c] bg-[#fef2f2]"
                    : "border-[#cbd5e1] hover:border-[#b91c1c] hover:bg-[#fafafa]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading || isLoading}
                  aria-label="Choose document file"
                />
                <div className="relative z-10">
                  <div className="w-12 h-12 mx-auto mb-3 bg-[#b91c1c]/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#131b2e] mb-1" style={{ fontFamily: "Inter, sans-serif" }}>
                    {isUploading ? "Uploading..." : "Click or drag to upload document"}
                  </p>
                  <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                    PDF, JPG, PNG up to 10MB
                  </p>
                </div>
              </div>
            )}

            {/* Documents List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-[#5b403d]">
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs mt-1">
                  {isReadOnly
                    ? "Documents will appear here when uploaded"
                    : "Upload your first document above"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#131b2e] flex items-center gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
                  <span>Uploaded Documents ({documents.length})</span>
                </h4>
                {documents.map((doc, _index) => (
                  <div
                    key={doc._id}
                    className="p-3 rounded-lg border border-[#e2e8f0] bg-[#fafbfc] hover:border-[#cbd5e1] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-lg border border-[#e2e8f0] flex items-center justify-center flex-shrink-0">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#131b2e] truncate" style={{ fontFamily: "Inter, sans-serif" }}>
                            {doc.originalFilename}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <span className="text-[11px] text-[#94a3b8]">•</span>
                            <span className="text-[11px] text-[#94a3b8]" style={{ fontFamily: "Inter, sans-serif" }}>
                              v{doc.version}
                            </span>
                            {getStatusBadge(doc.processingStatus)}
                            {getStatusBadge(doc.verificationStatus)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                          title="Download"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        {/* Extract Text Button */}
                        <button
                          onClick={() => {
                            const existingExtraction = doc.extraction || extractionResults[doc._id];
                            if (existingExtraction?.status === "COMPLETED" || existingExtraction?.status === "PARTIAL") {
                              handleGetExtraction(doc);
                            } else {
                              handleExtractText(doc);
                            }
                          }}
                          disabled={isLoading || isUploading || extractingDocId === doc._id}
                          className={`p-2 rounded-lg transition-colors ${
                            extractingDocId === doc._id
                              ? "bg-amber-100 text-amber-700 cursor-wait"
                              : "text-[#5b403d] hover:bg-[#f1f5f9]"
                          }`}
                          title={
                            extractingDocId === doc._id
                              ? "Extracting..."
                              : doc.extraction?.status === "COMPLETED" || doc.extraction?.status === "PARTIAL"
                              ? "View Extraction"
                              : "Extract Text"
                          }
                        >
                          {extractingDocId === doc._id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 002-2h2a2 2 0 002 2" />
                            </svg>
                          )}
                        </button>
                        {/* Classify Document Button */}
                        <button
                          onClick={() => {
                            const existingExtraction = doc.extraction || extractionResults[doc._id];
                            const existingClassification = doc.classification || classificationResults[doc._id];
                            const canClassify = existingExtraction?.status === "COMPLETED" || existingExtraction?.status === "PARTIAL";
                            const isClassifying = classifyingDocId === doc._id;
                            
                            if (!canClassify && !isClassifying) {
                              setError("Text extraction must be completed first");
                              return;
                            }
                            
                            if (existingClassification?.status === "COMPLETED" && !isClassifying) {
                              handleGetClassification(doc);
                            } else if (isClassifying) {
                              // Do nothing, already classifying
                            } else {
                              handleClassifyDocument(doc);
                            }
                          }}
                          disabled={isLoading || isUploading || classifyingDocId === doc._id || 
                            !(doc.extraction?.status === "COMPLETED" || doc.extraction?.status === "PARTIAL" || extractionResults[doc._id]?.status === "COMPLETED" || extractionResults[doc._id]?.status === "PARTIAL")}
                          className={`p-2 rounded-lg transition-colors ${
                            classifyingDocId === doc._id
                              ? "bg-amber-100 text-amber-700 cursor-wait"
                              : "text-[#5b403d] hover:bg-[#f1f5f9] opacity-60"
                          }`}
                          title={
                            classifyingDocId === doc._id
                              ? "Classifying..."
                              : doc.classification?.status === "COMPLETED" || classificationResults[doc._id]?.status === "COMPLETED"
                              ? "View Classification"
                              : "Classify Document (AI)"
                          }
                        >
                          {classifyingDocId === doc._id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          )}
                        </button>
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="p-2 text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                              title="Replace"
                              disabled={isLoading || isUploading}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(doc._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                              disabled={isLoading}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-2" style={{ fontFamily: "Inter, sans-serif" }}>
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {/* Extraction Results */}
                    {(() => {
                      const extraction = doc.extraction || extractionResults[doc._id];
                      if (!extraction) return null;

                      return (
                        <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-[#475569]">Extraction:</span>
                            {getExtractionStatusBadge(extraction.status)}
                            {getMethodBadge(extraction.method)}
                            <span className="text-[11px] text-[#5b403d]">
                              {extraction.processedPages}/{extraction.totalPages} pages
                            </span>
                            {extraction.textSize > 0 && (
                              <span className="text-[11px] text-[#5b403d]">
                                {Math.round(extraction.textSize / 1024)} KB text
                              </span>
                            )}
                          </div>

                          {extraction.error && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
                              <strong>Error:</strong> {extraction.error}
                              {extraction.errorCategory && <span className="ml-2">({extraction.errorCategory})</span>}
                            </div>
                          )}

                          {extraction.status === "COMPLETED" || extraction.status === "PARTIAL" ? (
                            <details className="group">
                              <summary className="cursor-pointer text-xs text-[#b91c1c] hover:underline flex items-center gap-1">
                                <span>View Extracted Text</span>
                                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-2 p-3 bg-white border border-[#e2e8f0] rounded max-h-48 overflow-auto text-[11px] font-mono text-[#131b2e] whitespace-pre-wrap">
                                {extraction.pages.map((page) => (
                                  <div key={page.pageNumber} className="mb-2">
                                    <div className="text-[10px] text-[#5b403d] mb-1">
                                      Page {page.pageNumber} ({page.method})
                                      {page.confidence && <span className="ml-2">Confidence: {Math.round(page.confidence)}%</span>}
                                      {page.error && <span className="ml-2 text-red-600">Error: {page.error}</span>}
                                    </div>
                                    <div>{page.text || "(no text extracted)"}</div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : extraction.status === "PROCESSING" ? (
                            <div className="text-[11px] text-[#5b403d] flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
                              <span>Processing... Check back shortly.</span>
                            </div>
                          ) : extraction.status === "FAILED" ? (
                            <div className="text-[11px] text-red-600">
                              Extraction failed. <button onClick={() => handleExtractText(doc)} className="underline hover:text-[#b91c1c]">Retry</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleExtractText(doc)}
                              disabled={extractingDocId === doc._id}
                              className="text-xs text-[#b91c1c] hover:underline"
                            >
                              Start Extraction
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Classification Results */}
                    {(() => {
                      const classification = doc.classification || classificationResults[doc._id];
                      if (!classification) return null;

                      return (
                        <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-[#475569]">AI Classification:</span>
                            {getClassificationStatusBadge(classification.status)}
                            {getMatchBadge(classification.matchesExpected)}
                            <span className="text-[11px] text-[#5b403d]">
                              Confidence: {classification.confidence}%
                            </span>
                          </div>

                          <div className="text-[11px] text-[#5b403d]">
                            <strong>Expected:</strong> {classification.expectedRequirementId || "—"} | 
                            <strong>Predicted:</strong> {classification.predictedRequirementName || "—"} ({classification.predictedRequirementId || "—"})
                          </div>

                          <div className="text-[11px] text-[#5b403d] italic">
                            {classification.explanation}
                          </div>

                          {classification.processingError && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
                              <strong>Error:</strong> {classification.processingError}
                              {classification.processingErrorCategory && <span className="ml-2">({classification.processingErrorCategory})</span>}
                            </div>
                          )}

                          {classification.status === "COMPLETED" ? (
                            <>
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-[#b91c1c] hover:underline flex items-center gap-1">
                                  <span>View Extracted Fields ({classification.extractedFields.length})</span>
                                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </summary>
                                <div className="mt-2 p-3 bg-white border border-[#e2e8f0] rounded max-h-60 overflow-auto text-[11px] font-mono text-[#131b2e] whitespace-pre-wrap">
                                  {classification.extractedFields.map((field, idx) => (
                                    <div key={idx} className="mb-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="font-semibold">{field.name}:</span>
                                        <span>{field.value !== null ? String(field.value) : "<missing>"}</span>
                                        {field.confidence && <span className="ml-2 text-[10px] text-[#5b403d]">Confidence: {field.confidence}%</span>}
                                        {field.missing && <span className="ml-2 text-[10px] text-red-600">(missing)</span>}
                                      </div>
                                    </div>
                                  ))}
                                  {classification.missingFields.length > 0 && (
                                    <div className="mt-2 text-[10px] text-red-600">
                                      Missing: {classification.missingFields.join(", ")}
                                    </div>
                                  )}
                                </div>
                              </details>
                            </>
                          ) : classification.status === "PROCESSING" ? (
                            <div className="text-[11px] text-[#5b403d] flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
                              <span>Classifying... Check back shortly.</span>
                            </div>
                          ) : classification.status === "FAILED" ? (
                            <div className="text-[11px] text-red-600">
                              Classification failed. <button onClick={() => handleClassifyDocument(doc)} className="underline hover:text-[#b91c1c]">Retry</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClassifyDocument(doc)}
                              disabled={classifyingDocId === doc._id}
                              className="text-xs text-[#b91c1c] hover:underline"
                            >
                              Start Classification
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[#e2e8f0]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#5b403d] border border-[#cbd5e1] rounded-lg hover:bg-[#f8fafc] transition-colors"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};