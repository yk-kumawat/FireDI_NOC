import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  getApplicationReviewSummary,
  getDocumentForInspector,
  startDocumentReview,
  completeDocumentReview,
  updateFindingReview,
  type ReviewStatus,
} from "../services/inspectorReviewApi";
import type { ApplicationStatus } from "../types/application";
import { DocumentVerificationSummary } from "../components/Verification/DocumentVerificationSummary";
import { InspectorDocumentReviewTab } from "../components/Verification/InspectorDocumentReviewTab";
import {
  StatCard,
  InfoRow,
  SectionCard,
  ReviewStatusBadge,
  DocumentRow,
  DocumentDetailsTab,
  DocumentDetailModal,
} from "../components/Verification";

const getStatusBadge = (status: ApplicationStatus) => {
  const config: Record<ApplicationStatus, { bg: string; text: string; dot: string; label: string }> = {
    DRAFT: { bg: "bg-[#f1f5f9]", text: "text-[#475569]", dot: "bg-[#475569]", label: "Draft" },
    SUBMITTED: { bg: "bg-[#eff6ff]", text: "text-[#1d4ed8]", dot: "bg-[#1d4ed8]", label: "Submitted" },
    UNDER_REVIEW: { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", dot: "bg-[#c2410c]", label: "Under Review" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border border-[#e2e8f0] ${c.bg} ${c.text}`} style={{ fontFamily: "Inter, sans-serif" }}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const getReviewStatusConfig = (status: ReviewStatus) => {
  const configs: Record<ReviewStatus, { bg: string; text: string; label: string }> = {
    NOT_REVIEWED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Reviewed" },
    IN_REVIEW: { bg: "bg-blue-100", text: "text-blue-700", label: "In Review" },
    REVIEWED: { bg: "bg-green-100", text: "text-green-700", label: "Reviewed" },
    FLAGGED_FOR_CORRECTION: { bg: "bg-amber-100", text: "text-amber-700", label: "Flagged for Correction" },
  };
  return configs[status] || configs.NOT_REVIEWED;
};

const getValidationStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    passed: { bg: "bg-green-100", text: "text-green-700", label: "Validation Passed" },
    mismatch_found: { bg: "bg-red-100", text: "text-red-700", label: "Mismatch Found" },
    needs_review: { bg: "bg-amber-100", text: "text-amber-700", label: "Needs Review" },
    insufficient_data: { bg: "bg-blue-100", text: "text-blue-700", label: "Insufficient Data" },
    category_mismatch: { bg: "bg-orange-100", text: "text-orange-700", label: "Category Mismatch" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Validation Failed" },
    not_validated: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Validated" },
  };
  return configs[status] || configs.not_validated;
};

const getVerificationStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    NOT_STARTED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Started" },
    PENDING_REVIEW: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Review" },
    VERIFIED: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  };
  return configs[status] || configs.NOT_STARTED;
};

const ReviewStatusBadge = ({ status }: { status: ReviewStatus }) => {
  const config = getReviewStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.bg} ${config.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{config.label}</span>
    </span>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    slate: { bg: "bg-slate-100", text: "text-slate-700" },
    green: { bg: "bg-green-100", text: "text-green-700" },
    red: { bg: "bg-red-100", text: "text-red-700" },
    amber: { bg: "bg-amber-100", text: "text-amber-700" },
    blue: { bg: "bg-blue-100", text: "text-blue-700" },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className={`p-3 rounded-lg ${c.bg}`}>
      <p className="text-2xl font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        {value}
      </p>
      <p className={`text-xs font-medium ${c.text}`} style={{ fontFamily: "Inter, sans-serif" }}>
        {label}
      </p>
    </div>
  );
};

const ReviewStatusBadge = ({ status }: { status: ReviewStatus }) => {
  const config = getReviewStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.bg} ${config.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{config.label}</span>
    </span>
  );
};

const InspectorReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<{
    applicationId: string;
    applicationNumber: string;
    applicantName: string;
    stats: any;
    documents: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<"details" | "validation" | "review">("details");

  const fetchSummary = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await getApplicationReviewSummary(token, id);
      setSummary(res);
    } catch (err: any) {
      setError(err.message || "Failed to load review summary");
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleDocumentClick = async (doc: any) => {
    if (!token || !id) return;
    setDocumentLoading(true);
    try {
      const res = await getDocumentForInspector(token, id, doc.documentId);
      setSelectedDocument(res.document);
      setActiveDocTab("details");
    } catch (err: any) {
      setError(err.message || "Failed to load document");
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleStartReview = async (documentId: string) => {
    if (!token || !id) return;
    try {
      await startDocumentReview(token, id, documentId);
      fetchSummary();
      if (selectedDocument?._id === documentId) {
        const res = await getDocumentForInspector(token, id, documentId);
        setSelectedDocument(res.document);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start review");
    }
  };

  const handleCompleteReview = async (documentId: string, status: "REVIEWED" | "FLAGGED_FOR_CORRECTION", findings: any[], overallNote?: string) => {
    if (!token || !id) return;
    try {
      await completeDocumentReview(token, id, documentId, { status, overallNote, findings });
      fetchSummary();
      if (selectedDocument?._id === documentId) {
        const res = await getDocumentForInspector(token, id, documentId);
        setSelectedDocument(res.document);
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete review");
    }
  };

  const handleUpdateFinding = async (documentId: string, findingId: string, status: any, note?: string) => {
    if (!token || !id) return;
    try {
      await updateFindingReview(token, id, documentId, findingId, { status, note });
      if (selectedDocument?._id === documentId) {
        const res = await getDocumentForInspector(token, id, documentId);
        setSelectedDocument(res.document);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update finding");
    }
  };

  // ── States ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <main className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#131b2e] mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Error Loading Application
          </h2>
          <p className="text-sm text-[#5b403d] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>{error}</p>
          <button onClick={fetchSummary} className="text-sm font-semibold text-[#b91c1c] hover:underline" style={{ fontFamily: "Inter, sans-serif" }}>
            Retry
          </button>
        </main>
      </div>
    );
  }

  if (!summary) return null;

  const { applicationId, applicationNumber, applicantName, stats, documents } = summary;

  const DocumentDetailsTab = ({ selectedDocument }: { selectedDocument: any }) => (
    <div className="space-y-4">
      <SectionCard title="Document Information">
        <InfoRow label="File Name" value={selectedDocument.originalFilename} />
        <InfoRow label="MIME Type" value={selectedDocument.mimeType} />
        <InfoRow label="File Size" value={`${Math.round(selectedDocument.fileSize / 1024)} KB`} />
        <InfoRow label="Version" value={selectedDocument.version} />
        <InfoRow label="Uploaded" value={new Date(selectedDocument.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
        <InfoRow label="Processing Status" value={selectedDocument.processingStatus} />
        <InfoRow label="Verification Status" value={selectedDocument.verificationStatus} />
      </SectionCard>

      {selectedDocument.extraction && (
        <SectionCard title="Text Extraction">
          <InfoRow label="Status" value={selectedDocument.extraction.status} />
          <InfoRow label="Method" value={selectedDocument.extraction.method} />
          <InfoRow label="Pages" value={`${selectedDocument.extraction.processedPages}/${selectedDocument.extraction.totalPages}`} />
          <InfoRow label="Text Size" value={`${Math.round(selectedDocument.extraction.textSize / 1024)} KB`} />
          {selectedDocument.extraction.error && <InfoRow label="Error" value={selectedDocument.extraction.error} />}
        </SectionCard>
      )}

      {selectedDocument.classification && (
        <SectionCard title="AI Classification">
          <InfoRow label="Status" value={selectedDocument.classification.status} />
          <InfoRow label="Expected" value={selectedDocument.classification.expectedRequirementId} />
          <InfoRow label="Predicted" value={selectedDocument.classification.predictedRequirementName} />
          <InfoRow label="Confidence" value={`${selectedDocument.classification.confidence}%`} />
          <InfoRow label="Matches Expected" value={selectedDocument.classification.matchesExpected ? "Yes" : "No"} />
          <InfoRow label="Explanation" value={selectedDocument.classification.explanation} />
          {selectedDocument.classification.processingError && <InfoRow label="Error" value={selectedDocument.classification.processingError} />}
        </SectionCard>
      )}
    </div>
  );

  const DocumentReviewTab = ({ 
    selectedDocument, 
    applicationId, 
    token, 
    id,
    handleCompleteReview,
    handleUpdateFinding,
  }: any) => (
    <div className="space-y-4">
      <SectionCard title="Inspector Review">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Overall Review Status
            </label>
            <div className="flex items-center gap-3">
              {["NOT_REVIEWED", "IN_REVIEW", "REVIEWED", "FLAGGED_FOR_CORRECTION"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleCompleteReview(selectedDocument._id, s as "REVIEWED" | "FLAGGED_FOR_CORRECTION", selectedDocument.review?.findings || [], "")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedDocument.review?.status === s ? "bg-[#b91c1c] text-white" : "bg-white text-[#5b403d] border border-[#e2e8f0]"}`}
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
            Review Notes
          </label>
          <textarea className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm" rows={4} placeholder="Enter review notes..." style={{ fontFamily: "Inter, sans-serif" }} />
        </div>

        {selectedDocument.validation && selectedDocument.validation.findings.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Finding Reviews
            </label>
            <div className="space-y-2">
              {selectedDocument.validation.findings.map((finding: any) => (
                <div key={finding.findingId} className="p-3 bg-[#fafbfc] border border-[#e2e8f0] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>{finding.fieldName}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${["NOT_REVIEWED", "REVIEWED", "FLAGGED_FOR_CORRECTION"].includes(selectedDocument.review?.findings?.find((rf: any) => rf.findingId === finding.findingId)?.status || "NOT_REVIEWED") ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {selectedDocument.review?.findings?.find((rf: any) => rf.findingId === finding.findingId)?.status || "NOT_REVIEWED"}
                    </span>
                  </div>
                  <p className="text-xs text-[#5b403d] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>{finding.explanation}</p>
                  <div className="flex gap-2">
                    {["NOT_REVIEWED", "REVIEWED", "FLAGGED_FOR_CORRECTION"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateFinding(selectedDocument._id, finding.findingId, s as any, "")}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${selectedDocument.review?.findings?.find((rf: any) => rf.findingId === finding.findingId)?.status === s ? "bg-[#b91c1c] text-white" : "bg-white text-[#5b403d] border border-[#e2e8f0]"}`}
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const DocumentDetailModal = ({ 
    selectedDocument, 
    onClose, 
    activeDocTab, 
    setActiveDocTab,
    applicationId,
    token,
    id,
    handleCompleteReview,
    handleUpdateFinding,
  }: any) => {
    if (!selectedDocument) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] bg-[#fafbfc] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#b91c1c]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                    {selectedDocument.originalFilename}
                  </h3>
                  <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                    {selectedDocument.requirementName} • v{selectedDocument.version}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                <nav className="flex gap-1 px-4" aria-label="Document tabs">
                  <button onClick={() => setActiveDocTab("details")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "details" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Details
                  </button>
                  <button onClick={() => setActiveDocTab("validation")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "validation" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Validation
                  </button>
                  <button onClick={() => setActiveDocTab("review")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "review" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Review
                  </button>
                </nav>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeDocTab === "details" && <DocumentDetailsTab selectedDocument={selectedDocument} />}
                {activeDocTab === "validation" && <DocumentVerificationSummary applicationId={applicationId} isApplicationDraft={false} />}
                {activeDocTab === "review" && <InspectorDocumentReviewTab selectedDocument={selectedDocument} applicationId={applicationId} token={token} id={id} handleCompleteReview={handleCompleteReview} handleUpdateFinding={handleUpdateFinding} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DocumentDetailsTab = ({ selectedDocument }: { selectedDocument: any }) => (
    <div className="space-y-4">
      <SectionCard title="Document Information">
        <InfoRow label="File Name" value={selectedDocument.originalFilename} />
        <InfoRow label="MIME Type" value={selectedDocument.mimeType} />
        <InfoRow label="File Size" value={`${Math.round(selectedDocument.fileSize / 1024)} KB`} />
        <InfoRow label="Version" value={selectedDocument.version} />
        <InfoRow label="Uploaded" value={new Date(selectedDocument.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
        <InfoRow label="Processing Status" value={selectedDocument.processingStatus} />
        <InfoRow label="Verification Status" value={selectedDocument.verificationStatus} />
      </SectionCard>

      {selectedDocument.extraction && (
        <SectionCard title="Text Extraction">
          <InfoRow label="Status" value={selectedDocument.extraction.status} />
          <InfoRow label="Method" value={selectedDocument.extraction.method} />
          <InfoRow label="Pages" value={`${selectedDocument.extraction.processedPages}/${selectedDocument.extraction.totalPages}`} />
          <InfoRow label="Text Size" value={`${Math.round(selectedDocument.extraction.textSize / 1024)} KB`} />
          {selectedDocument.extraction.error && <InfoRow label="Error" value={selectedDocument.extraction.error} />}
        </SectionCard>
      )}

      {selectedDocument.classification && (
        <SectionCard title="AI Classification">
          <InfoRow label="Status" value={selectedDocument.classification.status} />
          <InfoRow label="Expected" value={selectedDocument.classification.expectedRequirementId} />
          <InfoRow label="Predicted" value={selectedDocument.classification.predictedRequirementName} />
          <InfoRow label="Confidence" value={`${selectedDocument.classification.confidence}%`} />
          <InfoRow label="Matches Expected" value={selectedDocument.classification.matchesExpected ? "Yes" : "No"} />
          <InfoRow label="Explanation" value={selectedDocument.classification.explanation} />
          {selectedDocument.classification.processingError && <InfoRow label="Error" value={selectedDocument.classification.processingError} />}
        </SectionCard>
      )}
    </div>
  );

  const DocumentDetailModal = ({ 
    selectedDocument, 
    onClose, 
    activeDocTab, 
    setActiveDocTab,
    applicationId,
    token,
    id,
    handleCompleteReview,
    handleUpdateFinding,
  }: any) => {
    if (!selectedDocument) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] bg-[#fafbfc] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#b91c1c]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                    {selectedDocument.originalFilename}
                  </h3>
                  <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                    {selectedDocument.requirementName} • v{selectedDocument.version}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                <nav className="flex gap-1 px-4" aria-label="Document tabs">
                  <button onClick={() => setActiveDocTab("details")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "details" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Details
                  </button>
                  <button onClick={() => setActiveDocTab("validation")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "validation" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Validation
                  </button>
                  <button onClick={() => setActiveDocTab("review")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeDocTab === "review" ? "text-[#b91c1c] border-[#b91c1c] bg-[#fef2f2]" : "text-[#5b403d] hover:text-[#131b2e] hover:bg-[#f8fafc]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                    Review
                  </button>
                </nav>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeDocTab === "details" && <DocumentDetailsTab selectedDocument={selectedDocument} />}
                {activeDocTab === "validation" && <DocumentVerificationSummary applicationId={applicationId} isApplicationDraft={false} />}
                {activeDocTab === "review" && <InspectorDocumentReviewTab selectedDocument={selectedDocument} applicationId={applicationId} token={token} id={id} handleCompleteReview={handleCompleteReview} handleUpdateFinding={handleUpdateFinding} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DocumentDetailsTab = ({ selectedDocument }: { selectedDocument: any }) => (
    <div className="space-y-4">
      <SectionCard title="Document Information">
        <InfoRow label="File Name" value={selectedDocument.originalFilename} />
        <InfoRow label="MIME Type" value={selectedDocument.mimeType} />
        <InfoRow label="File Size" value={`${Math.round(selectedDocument.fileSize / 1024)} KB`} />
        <InfoRow label="Version" value={selectedDocument.version} />
        <InfoRow label="Uploaded" value={new Date(selectedDocument.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
        <InfoRow label="Processing Status" value={selectedDocument.processingStatus} />
        <InfoRow label="Verification Status" value={selectedDocument.verificationStatus} />
      </SectionCard>

      {selectedDocument.extraction && (
        <SectionCard title="Text Extraction">
          <InfoRow label="Status" value={selectedDocument.extraction.status} />
          <InfoRow label="Method" value={selectedDocument.extraction.method} />
          <InfoRow label="Pages" value={`${selectedDocument.extraction.processedPages}/${selectedDocument.extraction.totalPages}`} />
          <InfoRow label="Text Size" value={`${Math.round(selectedDocument.extraction.textSize / 1024)} KB`} />
          {selectedDocument.extraction.error && <InfoRow label="Error" value={selectedDocument.extraction.error} />}
        </SectionCard>
      )}

      {selectedDocument.classification && (
        <SectionCard title="AI Classification">
          <InfoRow label="Status" value={selectedDocument.classification.status} />
          <InfoRow label="Expected" value={selectedDocument.classification.expectedRequirementId} />
          <InfoRow label="Predicted" value={selectedDocument.classification.predictedRequirementName} />
          <InfoRow label="Confidence" value={`${selectedDocument.classification.confidence}%`} />
          <InfoRow label="Matches Expected" value={selectedDocument.classification.matchesExpected ? "Yes" : "No"} />
          <InfoRow label="Explanation" value={selectedDocument.classification.explanation} />
          {selectedDocument.classification.processingError && <InfoRow label="Error" value={selectedDocument.classification.processingError} />}
        </SectionCard>
      )}
    </div>
  );

  const DocumentRow = ({ doc, onClick, getReviewStatusConfig, getValidationStatusConfig, getVerificationStatusConfig }: any) => (
    <div key={doc.documentId} className="p-4 hover:bg-[#fafbfc] transition-colors cursor-pointer" onClick={() => onClick(doc)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg border border-[#e2e8f0] flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
              {doc.requirementName}
            </p>
            <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              {doc.required ? "Mandatory" : "Optional"} • {doc.originalFilename}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ReviewStatusBadge status={doc.reviewStatus} />
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${getValidationStatusConfig(doc.validationStatus).bg} ${getValidationStatusConfig(doc.validationStatus).text}`}>
            {getValidationStatusConfig(doc.validationStatus).label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${getVerificationStatusConfig(doc.verificationStatus).bg} ${getVerificationStatusConfig(doc.verificationStatus).text}`}>
            {getVerificationStatusConfig(doc.verificationStatus).label}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-[#b91c1c] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Fire Dept. Inspection & NoC
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1" style={{ fontFamily: "Inter, sans-serif" }}>
              <Link to="/inspector/dashboard" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">Dashboard</Link>
              <Link to="/inspector/applications" className="px-4 py-2 text-sm font-medium text-[#b91c1c] bg-[#fef2f2] rounded-lg">Applications</Link>
            </nav>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pl-4 border-l border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#b91c1c] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>{user?.name}</span>
                </div>
                <button onClick={() => useAuth().logout()} className="p-2 text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors" title="Logout">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => navigate("/inspector/applications")} className="text-sm text-[#5b403d] hover:text-[#b91c1c] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
              Applications
            </button>
            <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-[#131b2e] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
              {applicationNumber}
            </span>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "-0.025em" }}>
                  {applicationNumber}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border ${stats.applicationStatus === 'UNDER_REVIEW' ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" : "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                  <span className={`w-2 h-2 rounded-full ${stats.applicationStatus === 'UNDER_REVIEW' ? "bg-[#c2410c]" : "bg-[#1d4ed8]"}`} />
                  {stats.applicationStatus || "SUBMITTED"}
                </span>
              </div>
              <p className="text-sm text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                Applicant: {applicantName}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
          <StatCard label="Total Required" value={stats.totalRequired} color="slate" />
          <StatCard label="Uploaded" value={stats.uploaded} color="blue" />
          <StatCard label="Awaiting Processing" value={stats.awaitingProcessing} color="amber" />
          <StatCard label="Pending Review" value={stats.pendingReview} color="amber" />
          <StatCard label="Verified" value={stats.verified} color="green" />
          <StatCard label="Rejected" value={stats.rejected} color="red" />
          <StatCard label="Validation Passed" value={stats.validationPassed} color="green" />
          <StatCard label="Missing" value={stats.notUploaded} color="slate" />
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] mb-5">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Documents for Review
            </h2>
          </div>
          <div className="divide-y divide-[#e2e8f0]">
            {documents.map((doc: any) => (
              <DocumentRow
                key={doc.documentId}
                doc={doc}
                onClick={handleDocumentClick}
                getReviewStatusConfig={getReviewStatusConfig}
                getValidationStatusConfig={getValidationStatusConfig}
                getVerificationStatusConfig={getVerificationStatusConfig}
                ReviewStatusBadge={ReviewStatusBadge}
              />
            ))}
            {documents.length === 0 && (
              <div className="p-8 text-center text-[#5b403d]">
                <p className="text-sm">No documents uploaded for this application</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Detail Modal */}
        {selectedDocument && (
          <DocumentDetailModal
            selectedDocument={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            activeDocTab={activeDocTab}
            setActiveDocTab={setActiveDocTab}
            applicationId={applicationId}
            token={token}
            id={id}
            selectedDocumentReview={selectedDocument.review}
            handleCompleteReview={handleCompleteReview}
            handleUpdateFinding={handleUpdateFinding}
          />
        )}
      </main>
    </div>
  );
};

export default InspectorReviewPage;