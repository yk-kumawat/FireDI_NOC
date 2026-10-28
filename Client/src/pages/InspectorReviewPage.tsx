import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  getApplicationReviewSummary,
  getDocumentForInspector,
  completeDocumentReview,
  updateFindingReview,
} from "../services/inspectorReviewApi";
import {
  DocumentRow,
  DocumentDetailModal,
} from "../components/Verification";

// DocumentDetailModal expects token: string, but useAuth returns string | null
// Since this page is protected, token should always be present
const getAuthToken = (token: string | null): string => token || "";

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
  return configs[status] || configs.NOT_REVIEWED;
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

const InspectorReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user, logout } = useAuth();
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
    try {
      const res = await getDocumentForInspector(token, id, doc.documentId);
      setSelectedDocument(res.document);
      setActiveDocTab("details");
    } catch (err: any) {
      setError(err.message || "Failed to load document");
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

  // States
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
                <button onClick={logout} className="p-2 text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors" title="Logout">
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
                doc={{
                  documentId: doc.documentId,
                  requirementName: doc.requirementName,
                  required: doc.required,
                  originalFilename: doc.originalFilename,
                  reviewStatus: doc.reviewStatus,
                  validationStatus: doc.validationStatus,
                  verificationStatus: doc.verificationStatus,
                }}
                onClick={handleDocumentClick}
                getValidationStatusConfig={getValidationStatusConfig}
                getVerificationStatusConfig={getVerificationStatusConfig}
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
            applicationId={applicationId || ""}
            token={getAuthToken(token)}
            id={id || ""}
            handleCompleteReview={handleCompleteReview}
            handleUpdateFinding={handleUpdateFinding}
            requirementName={documents.find((d: any) => d.documentId === selectedDocument._id)?.requirementName || selectedDocument.requirementId || ""}
          />
        )}
      </main>
    </div>
  );
};

export default InspectorReviewPage;