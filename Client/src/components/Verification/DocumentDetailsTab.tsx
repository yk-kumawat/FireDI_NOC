import { InfoRow } from "./InfoRow";
import { SectionCard } from "./SectionCard";
import type { Document } from "../../types/checklist";

interface DocumentDetailsTabProps {
  selectedDocument: Document;
}

export const DocumentDetailsTab = ({ selectedDocument }: DocumentDetailsTabProps) => (
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