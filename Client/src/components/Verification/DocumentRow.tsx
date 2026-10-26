import { ReviewStatusBadge } from "./StatusBadge";
import type { DocumentVerificationStatus, ValidationOverallStatus } from "../../types/checklist";

interface DocumentRowProps {
  doc: {
    documentId: string;
    requirementName: string;
    required: boolean;
    originalFilename: string;
    reviewStatus: string;
    validationStatus: ValidationOverallStatus | "not_validated";
    verificationStatus: DocumentVerificationStatus;
  };
  onClick: (doc: DocumentRowProps["doc"]) => void;
  getValidationStatusConfig: (status: string) => { bg: string; text: string; label: string };
  getVerificationStatusConfig: (status: string) => { bg: string; text: string; label: string };
}

export const DocumentRow = ({
  doc,
  onClick,
  getValidationStatusConfig,
  getVerificationStatusConfig,
}: DocumentRowProps) => (
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