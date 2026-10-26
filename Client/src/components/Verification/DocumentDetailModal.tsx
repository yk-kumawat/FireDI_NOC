import { DocumentDetailTabs } from "./DocumentDetailTabs";
import type { Document, ReviewStatus, ReviewFinding } from "../../types/checklist";

interface DocumentDetailModalProps {
  selectedDocument: Document | null;
  onClose: () => void;
  activeDocTab: "details" | "validation" | "review";
  setActiveDocTab: (tab: "details" | "validation" | "review") => void;
  applicationId: string;
  token: string;
  id: string;
  handleCompleteReview: (documentId: string, status: "REVIEWED" | "FLAGGED_FOR_CORRECTION", findings: ReviewFinding[], overallNote?: string) => Promise<void>;
  handleUpdateFinding: (documentId: string, findingId: string, status: ReviewStatus, note?: string) => Promise<void>;
}

export const DocumentDetailModal = ({
  selectedDocument,
  onClose,
  activeDocTab,
  setActiveDocTab,
  applicationId,
  token,
  id,
  handleCompleteReview,
  handleUpdateFinding,
}: DocumentDetailModalProps) => {
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
              <DocumentDetailTabs
                selectedDocument={selectedDocument}
                activeDocTab={activeDocTab}
                setActiveDocTab={setActiveDocTab}
                applicationId={applicationId}
                token={token}
                id={id}
                handleCompleteReview={handleCompleteReview}
                handleUpdateFinding={handleUpdateFinding}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};