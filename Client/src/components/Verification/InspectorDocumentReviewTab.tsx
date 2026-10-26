import { useState } from "react";
import { SectionCard } from "./SectionCard";
import { getValidationStatusConfig, getFindingStatusConfig } from "../../utils/verificationUtils";
import type { Document, ReviewStatus, ReviewFinding, ValidationFinding } from "../../types/checklist";

interface DocumentReviewTabProps {
  selectedDocument: Document;
  applicationId: string;
  token: string;
  id: string;
  handleCompleteReview: (documentId: string, status: "REVIEWED" | "FLAGGED_FOR_CORRECTION", findings: ReviewFinding[], overallNote?: string) => Promise<void>;
  handleUpdateFinding: (documentId: string, findingId: string, status: ReviewStatus, note?: string) => Promise<void>;
}

export function InspectorDocumentReviewTab({ 
  selectedDocument, 
  handleCompleteReview,
  handleUpdateFinding,
}: DocumentReviewTabProps) {
  const [overallNote, setOverallNote] = useState(selectedDocument.review?.overallNote || "");
  const [findingNotes, setFindingNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build review findings from current state
  const buildReviewFindings = (): ReviewFinding[] => {
    if (!selectedDocument.validation) return [];
    return selectedDocument.validation.findings.map((finding: ValidationFinding) => {
      const existingReview = selectedDocument.review?.findings?.find((rf: ReviewFinding) => rf.findingId === finding.findingId);
      return {
        findingId: finding.findingId,
        status: existingReview?.status || "NOT_REVIEWED",
        reviewerNote: findingNotes[finding.findingId] || existingReview?.reviewerNote || "",
        reviewedAt: existingReview?.reviewedAt,
        reviewedBy: existingReview?.reviewedBy,
      };
    });
  };

  const getFindingReviewStatus = (findingId: string): ReviewStatus => {
    return selectedDocument.review?.findings?.find((rf: ReviewFinding) => rf.findingId === findingId)?.status || "NOT_REVIEWED";
  };

  const handleOverallStatusChange = async (status: "REVIEWED" | "FLAGGED_FOR_CORRECTION") => {
    if (!selectedDocument.validation) return;
    setIsSubmitting(true);
    try {
      await handleCompleteReview(selectedDocument._id, status, buildReviewFindings(), overallNote);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindingStatusChange = async (findingId: string, status: ReviewStatus) => {
    const note = findingNotes[findingId] || "";
    setIsSubmitting(true);
    try {
      await handleUpdateFinding(selectedDocument._id, findingId, status, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  const findingStatusOptions: ReviewStatus[] = ["NOT_REVIEWED", "REVIEWED", "FLAGGED_FOR_CORRECTION"];

  if (!selectedDocument.validation || selectedDocument.validation.findings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionCard title="Inspector Review">
          <div className="text-center py-8 text-[#5b403d]">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              No Validation Findings to Review
            </p>
            <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              Run validation on this document to generate findings for review.
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  const overallConfig = getValidationStatusConfig(selectedDocument.validation.overallStatus);

  return (
    <div className="space-y-4">
      <SectionCard title="Inspector Review">
        <div className="space-y-5">
          {/* Document Validation Summary */}
          <div className="p-3 bg-[#fafbfc] border border-[#e2e8f0] rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
                Document Validation Status
              </h4>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${overallConfig.bg} ${overallConfig.text}`}>
                {overallConfig.label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#5b403d]">
              <div>Expected: <span className="font-mono text-[#131b2e] ml-1">{selectedDocument.validation.expectedRequirementId}</span></div>
              {selectedDocument.validation.predictedRequirementId && (
                <div>Predicted: <span className="font-mono text-[#131b2e] ml-1">{selectedDocument.validation.predictedRequirementId}</span></div>
              )}
              <div>Total Findings: <span className="font-medium ml-1">{selectedDocument.validation.findings.length}</span></div>
              <div>Mandatory: <span className="font-medium ml-1">{selectedDocument.validation.findings.filter(f => f.isRequired).length}</span></div>
            </div>
          </div>

          {/* Overall Review Status */}
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Overall Review Status
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {(["NOT_REVIEWED", "IN_REVIEW", "REVIEWED", "FLAGGED_FOR_CORRECTION"] as const).map((s) => {
                const statusConfig = getFindingStatusConfig(s);
                const isActive = selectedDocument.review?.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleOverallStatusChange(s as "REVIEWED" | "FLAGGED_FOR_CORRECTION")}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isActive ? "bg-[#b91c1c] text-white" : `bg-white text-[#5b403d] border ${statusConfig.bg} ${statusConfig.text}`}`}
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {s.replace("_", " ")}
                  </button>
                );
              })}
            </div>
            {selectedDocument.review && (
              <p className="mt-1 text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                Current: <span className="font-medium text-[#131b2e]">{selectedDocument.review.status.replace("_", " ")}</span>
                {selectedDocument.review.completedAt && (
                  <> • Completed: <span className="font-medium">{new Date(selectedDocument.review.completedAt).toLocaleDateString("en-IN")}</span></>
                )}
              </p>
            )}
          </div>

          {/* Overall Review Notes */}
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Overall Review Notes
            </label>
            <textarea
              value={overallNote}
              onChange={(e) => setOverallNote(e.target.value)}
              className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm"
              rows={4}
              placeholder="Enter overall review notes and observations..."
              style={{ fontFamily: "Inter, sans-serif" }}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              These notes will be saved with the review completion.
            </p>
          </div>

          {/* Finding-Level Reviews */}
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Finding-Level Reviews
            </label>
            <p className="text-xs text-[#5b403d] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
              Review each validation finding. Mark as <span className="font-medium text-green-700">Reviewed</span> if you agree with the finding, or <span className="font-medium text-amber-700">Flagged for Correction</span> if the applicant needs to address it.
            </p>
            <div className="space-y-3">
              {selectedDocument.validation.findings.map((finding: ValidationFinding) => {
                const findingConfig = getFindingStatusConfig(finding.status);
                const reviewStatus = getFindingReviewStatus(finding.findingId);
                const reviewStatusConfig = getFindingStatusConfig(reviewStatus);
                const note = findingNotes[finding.findingId] || selectedDocument.review?.findings?.find((rf: ReviewFinding) => rf.findingId === finding.findingId)?.reviewerNote || "";

                return (
                  <div key={finding.findingId} className="p-3 bg-[#fafbfc] border border-[#e2e8f0] rounded-lg">
                    {/* Finding Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h5 className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
                            {finding.fieldName}
                          </h5>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${findingConfig.bg} ${findingConfig.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${findingConfig.dot}`} />
                            {findingConfig.label}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${finding.isRequired ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
                            {finding.isRequired ? "MANDATORY" : "OPTIONAL"}
                          </span>
                        </div>
                        <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                          {finding.explanation}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${reviewStatusConfig.bg} ${reviewStatusConfig.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${reviewStatusConfig.dot}`} />
                          {reviewStatus.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Details */}
                    <details className="mb-3">
                      <summary className="cursor-pointer text-xs text-[#b91c1c] hover:underline flex items-center gap-1">
                        <span>View Comparison Details</span>
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-2 p-2 bg-white border border-[#e2e8f0] rounded text-[11px] font-mono text-[#131b2e] space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#5b403d]">Document Value:</span>
                          <span className="bg-[#f1f5f9] px-2 py-0.5 rounded break-all max-w-full">
                            {finding.documentValue !== null && finding.documentValue !== undefined ? String(finding.documentValue) : "<missing>"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#5b403d]">Application Value:</span>
                          <span className="bg-[#f1f5f9] px-2 py-0.5 rounded break-all max-w-full">
                            {finding.applicationValue !== null && finding.applicationValue !== undefined ? String(finding.applicationValue) : "<missing>"}
                          </span>
                        </div>
                        {finding.normalizedDocumentValue !== undefined && finding.normalizedDocumentValue !== null && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#5b403d]">Normalized Doc:</span>
                            <span className="bg-green-50 px-2 py-0.5 rounded break-all max-w-full text-green-700">{String(finding.normalizedDocumentValue)}</span>
                          </div>
                        )}
                        {finding.normalizedApplicationValue !== undefined && finding.normalizedApplicationValue !== null && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#5b403d]">Normalized App:</span>
                            <span className="bg-green-50 px-2 py-0.5 rounded break-all max-w-full text-green-700">{String(finding.normalizedApplicationValue)}</span>
                          </div>
                        )}
                        {finding.confidence !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-[#5b403d]">Confidence:</span>
                            <span className="font-medium text-[#131b2e]">{finding.confidence}%</span>
                          </div>
                        )}
                      </div>
                    </details>

                    {/* Finding Review Actions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
                          Review Status:
                        </label>
                        {findingStatusOptions.map((s) => {
                          const statusConfig = getFindingStatusConfig(s);
                          const isActive = reviewStatus === s;
                          return (
                            <button
                              key={s}
                              onClick={() => handleFindingStatusChange(finding.findingId, s)}
                              disabled={isSubmitting}
                              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${isActive ? "bg-[#b91c1c] text-white" : `bg-white text-[#5b403d] border ${statusConfig.bg} ${statusConfig.text}`}`}
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              {s.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                      <div>
                        <label className="block text-xs text-[#5b403d] mb-1" style={{ fontFamily: "Inter, sans-serif" }}>
                          Review Note (optional)
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setFindingNotes(prev => ({ ...prev, [finding.findingId]: e.target.value }))}
                          className="w-full p-2 border border-[#e2e8f0] rounded text-xs"
                          rows={2}
                          placeholder="Add a note for this finding..."
                          style={{ fontFamily: "Inter, sans-serif" }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complete Review Button */}
          <div className="pt-4 border-t border-[#e2e8f0]">
            <button
              onClick={() => handleOverallStatusChange("REVIEWED")}
              disabled={isSubmitting}
              className="w-full md:w-auto px-5 py-2.5 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Review
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              Completing the review will save all finding statuses and notes. Use "Flagged for Correction" if the applicant needs to resubmit documents.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}