import { SectionCard } from "./SectionCard";
import type { ReviewStatus, ValidationFinding, ReviewFinding, Document } from "../../types/checklist";

interface DocumentReviewTabProps {
  selectedDocument: Document;
  applicationId: string;
  token: string;
  id: string;
  handleCompleteReview: (documentId: string, status: "REVIEWED" | "FLAGGED_FOR_CORRECTION", findings: ReviewFinding[], overallNote?: string) => Promise<void>;
  handleUpdateFinding: (documentId: string, findingId: string, status: ReviewStatus, note?: string) => Promise<void>;
}

const statusOptions = ["NOT_REVIEWED", "IN_REVIEW", "REVIEWED", "FLAGGED_FOR_CORRECTION"] as const;

function renderFindingReviews(
  selectedDocument: Document,
  handleUpdateFinding: (documentId: string, findingId: string, status: ReviewStatus, note?: string) => Promise<void>
) {
  if (!selectedDocument.validation || selectedDocument.validation.findings.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
        Finding Reviews
      </label>
      <div className="space-y-2">
        {selectedDocument.validation.findings.map((finding: ValidationFinding) => {
          const findingStatus = selectedDocument.review?.findings?.find((rf: ReviewFinding) => rf.findingId === finding.findingId)?.status || "NOT_REVIEWED";
          
          return (
            <div key={finding.findingId} className="p-3 bg-[#fafbfc] border border-[#e2e8f0] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>{finding.fieldName}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${findingStatus === "NOT_REVIEWED" ? "bg-slate-100 text-slate-700" : "bg-green-100 text-green-700"}`}>
                  {findingStatus}
                </span>
              </div>
              <p className="text-xs text-[#5b403d] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>{finding.explanation}</p>
              <div className="flex gap-2">
                {(["NOT_REVIEWED", "REVIEWED", "FLAGGED_FOR_CORRECTION"] as ReviewStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateFinding(selectedDocument._id, finding.findingId, s, "")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${findingStatus === s ? "bg-[#b91c1c] text-white" : "bg-white text-[#5b403d] border border-[#e2e8f0]"}`}
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const DocumentReviewTab = ({ 
  selectedDocument, 
  handleCompleteReview,
  handleUpdateFinding,
}: DocumentReviewTabProps) => {
  return (
    <div className="space-y-4">
      <SectionCard title="Inspector Review">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#131b2e] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
              Overall Review Status
            </label>
            <div className="flex items-center gap-3">
              {statusOptions.map((s) => (
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

        {renderFindingReviews(selectedDocument, handleUpdateFinding)}
      </SectionCard>
    </div>
  );
};