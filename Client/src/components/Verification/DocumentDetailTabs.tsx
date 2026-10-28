import { DocumentDetailsTab } from "./DocumentDetailsTab";
import { ValidationFindingsSummary } from "./ValidationFindingsSummary";
import { InspectorDocumentReviewTab } from "./InspectorDocumentReviewTab";
import type { Document, ReviewStatus, ReviewFinding } from "../../types/checklist";

interface DocumentDetailTabsProps {
  selectedDocument: Document;
  activeDocTab: "details" | "validation" | "review";
  setActiveDocTab: (tab: "details" | "validation" | "review") => void;
  applicationId: string;
  token: string;
  id: string;
  handleCompleteReview: (documentId: string, status: "REVIEWED" | "FLAGGED_FOR_CORRECTION", findings: ReviewFinding[], overallNote?: string) => Promise<void>;
  handleUpdateFinding: (documentId: string, findingId: string, status: ReviewStatus, note?: string) => Promise<void>;
}

export const DocumentDetailTabs = ({
  selectedDocument,
  activeDocTab,
  applicationId,
  token,
  id,
  handleCompleteReview,
  handleUpdateFinding,
}: DocumentDetailTabsProps) => (
  <>
    {activeDocTab === "details" && <DocumentDetailsTab selectedDocument={selectedDocument} />}

    {activeDocTab === "validation" && (
      selectedDocument.validation ? (
        <ValidationFindingsSummary validation={selectedDocument.validation} />
      ) : (
        <div className="text-center py-12 bg-[#fafbfc] rounded-xl border border-[#e2e8f0] p-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-[#131b2e] mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            No Validation Findings Available
          </h4>
          <p className="text-sm text-[#5b403d] max-w-md mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
            This document has not been run through automated rule validation yet. Validation findings will appear here once automated rule checks are processed.
          </p>
        </div>
      )
    )}

    {activeDocTab === "review" && (
      <InspectorDocumentReviewTab
        selectedDocument={selectedDocument}
        applicationId={applicationId}
        token={token}
        id={id}
        handleCompleteReview={handleCompleteReview}
        handleUpdateFinding={handleUpdateFinding}
      />
    )}
  </>
);
