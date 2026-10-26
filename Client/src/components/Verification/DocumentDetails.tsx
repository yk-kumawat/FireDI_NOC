import type { Document } from "../../types/checklist";
import { getExtractionStatusConfig, getClassificationStatusConfig } from "../../utils/verificationUtils";

interface DocumentDetailsProps {
  doc: Document;
  validationConfig: ReturnType<typeof import("../../utils/verificationUtils").getValidationStatusConfig>;
}

export const DocumentDetails = ({ doc, validationConfig }: DocumentDetailsProps) => (
  <div className="mt-2 p-3 bg-white border border-[#e2e8f0] rounded space-y-2 text-[11px]">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[#5b403d]">File:</span>
      <span className="font-mono text-[#131b2e]">{doc.originalFilename}</span>
      <span className="text-[#5b403d]">v{doc.version}</span>
      <span className="text-[#5b403d]">({Math.round(doc.fileSize / 1024)} KB)</span>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[#5b403d]">Uploaded:</span>
      <span>{new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
    </div>
    {doc.extraction && (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#5b403d]">Extraction:</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${getExtractionStatusConfig(doc.extraction.status).bg} ${getExtractionStatusConfig(doc.extraction.status).text}`}>
          {getExtractionStatusConfig(doc.extraction.status).label}
        </span>
        <span className="text-[#5b403d]">{doc.extraction.processedPages}/{doc.extraction.totalPages} pages</span>
      </div>
    )}
    {doc.classification && (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#5b403d]">AI Classification:</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${getClassificationStatusConfig(doc.classification.status).bg} ${getClassificationStatusConfig(doc.classification.status).text}`}>
          {getClassificationStatusConfig(doc.classification.status).label}
        </span>
        <span className="text-[#5b403d]">Confidence: {doc.classification.confidence}%</span>
        {doc.classification.matchesExpected && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">Matches Expected</span>
        )}
      </div>
    )}
    {doc.validation && (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#5b403d]">Validation:</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${validationConfig.bg} ${validationConfig.text}`}>
          {validationConfig.label}
        </span>
        <span className="text-[#5b403d]">{doc.validation.findings.length} findings</span>
      </div>
    )}
  </div>
);