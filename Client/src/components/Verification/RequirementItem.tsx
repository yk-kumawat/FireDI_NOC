import type { ChecklistItem, Document } from "../../types/checklist";
import { StatusBadge } from "./StatusBadge";
import { DocumentDetails } from "./DocumentDetails";
import { getValidationStatusConfig, getProcessingStatusConfig, getVerificationStatusConfig, getItemStatusConfig } from "../../utils/verificationUtils";

interface RequirementItemProps {
  item: ChecklistItem;
  documentsMap: Record<string, Document[]>;
  isApplicationDraft: boolean;
}

export const RequirementItem = ({
  item,
  documentsMap,
  isApplicationDraft,
}: RequirementItemProps) => {
  const docs = documentsMap[item.requirementId] || [];
  const latestDoc = docs[0];
  const { status: itemStatus, doc } = getItemStatusConfig(latestDoc);

  const validationStatus = doc?.validation?.overallStatus || "not_validated";
  const validationConfig = getValidationStatusConfig(validationStatus);
  const processingConfig = doc ? getProcessingStatusConfig(doc.processingStatus) : null;

  return (
    <div className="p-4 rounded-lg border border-[#e2e8f0] bg-[#fafbfc] hover:border-[#cbd5e1] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
              {item.name}
            </h4>
            <StatusBadge status={itemStatus} />
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${item.required ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
              {item.required ? "MANDATORY" : "OPTIONAL"}
            </span>
          </div>

          <p className="text-xs text-[#5b403d] leading-relaxed mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
            {item.description}
          </p>

          {doc && (
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#64748b] mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${validationConfig.bg} ${validationConfig.text}`}>
                {validationConfig.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${processingConfig?.bg} ${processingConfig?.text}`}>
                {processingConfig?.label}
              </span>
              <span className="flex items-center gap-1">
                <strong className="text-[#475569]">Verification:</strong>{" "}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${getVerificationStatusConfig(doc.verificationStatus).bg} ${getVerificationStatusConfig(doc.verificationStatus).text}`}>
                  {getVerificationStatusConfig(doc.verificationStatus).label}
                </span>
              </span>
            </div>
          )}

          {doc && doc.validation && (
            <div className="mb-2">
              <span className="text-[#b91c1c] hover:underline cursor-pointer" title="Click to view validation details">
                View validation findings ({doc.validation.findings.length})
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#64748b] mt-1">
            <span className="flex items-center gap-1">
              <strong className="text-[#475569]">Rule Reason:</strong>{" "}
              {item.applicableReason}
            </span>
            <span>•</span>
            <span className="italic">{item.sourceReference}</span>
          </div>
        </div>

        {isApplicationDraft && doc && (
          <div className="shrink-0 pt-1 flex items-center gap-1.5">
            <button className="px-3 py-1.5 text-xs font-semibold bg-[#b91c1c] text-white hover:bg-[#991b1b] rounded-lg transition-colors shadow-sm" style={{ fontFamily: "Inter, sans-serif" }}>
              Manage Document
            </button>
          </div>
        )}
      </div>

      {doc && (
        <details className="group mt-3 pt-3 border-t border-[#e2e8f0]">
          <summary className="cursor-pointer text-xs text-[#b91c1c] hover:underline flex items-center gap-1">
            <span>Document Details</span>
            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <DocumentDetails doc={doc} validationConfig={validationConfig} />
        </details>
      )}
    </div>
  );
};