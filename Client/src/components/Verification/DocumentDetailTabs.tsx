import { DocumentDetailsTab } from "./DocumentDetailsTab";
import { DocumentVerificationSummary } from "./DocumentVerificationSummary";
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
    {activeDocTab === "validation" && <DocumentVerificationSummary applicationId={applicationId} isApplicationDraft={false} />}
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