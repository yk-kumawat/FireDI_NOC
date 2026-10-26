import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  validateDocument,
  revalidateDocument,
  getValidation,
  type DocumentValidationResult,
  type ValidationOverallStatus,
  type ValidationFindingStatus,
} from "../../services/validationApi";
import type { Document } from "../../types/checklist";
import type { ReactNode } from "react";

interface ValidationResultsProps {
  applicationId: string;
  document: Document;
  isReadOnly?: boolean;
}

const getOverallStatusConfig = (status: ValidationOverallStatus) => {
  const configs: Record<ValidationOverallStatus, { bg: string; text: string; label: string; icon: ReactNode }> = {
    passed: {
      bg: "bg-green-50",
      text: "text-green-700",
      label: "Passed",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    mismatch_found: {
      bg: "bg-red-50",
      text: "text-red-700",
      label: "Mismatch Found",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    needs_review: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Needs Review",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    insufficient_data: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: "Insufficient Data",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    category_mismatch: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      label: "Category Mismatch",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    failed: {
      bg: "bg-red-50",
      text: "text-red-700",
      label: "Failed",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    },
  };
  return configs[status] || configs.passed;
};

const getFindingStatusConfig = (status: ValidationFindingStatus) => {
  const configs: Record<ValidationFindingStatus, { bg: string; text: string; label: string; dot: string }> = {
    passed: { bg: "bg-green-100", text: "text-green-700", label: "Passed", dot: "bg-green-500" },
    mismatch_found: { bg: "bg-red-100", text: "text-red-700", label: "Mismatch", dot: "bg-red-500" },
    needs_review: { bg: "bg-amber-100", text: "text-amber-700", label: "Needs Review", dot: "bg-amber-500" },
    insufficient_data: { bg: "bg-blue-100", text: "text-blue-700", label: "Insufficient Data", dot: "bg-blue-500" },
    not_applicable: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Applicable", dot: "bg-slate-500" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed", dot: "bg-red-500" },
    category_mismatch: { bg: "bg-orange-100", text: "text-orange-700", label: "Category Mismatch", dot: "bg-orange-500" },
  };
  return configs[status] || configs.passed;
};

const getComparisonMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    exact: "Exact Match",
    normalized: "Normalized Match",
    fuzzy_similarity: "Similar (Review)",
    date_comparison: "Date Comparison",
    numeric_comparison: "Numeric Comparison",
    registration_number: "Reg. Number Compare",
    address_comparison: "Address Comparison",
    boolean_match: "Boolean Match",
    not_compared: "Not Compared",
  };
  return labels[method] || method;
};

export const ValidationResults = ({
  applicationId,
  document,
  isReadOnly = false,
}: ValidationResultsProps) => {
  const { token } = useAuth();
  const [validation, setValidation] = useState<DocumentValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const fetchValidation = useCallback(async () => {
    if (!token || !applicationId || !document._id) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await getValidation(token, applicationId, document._id);
      setValidation(res.validation);
    } catch (err: any) {
      // If no validation exists yet, that's OK
      if (!err.message.includes("404") && !err.message.includes("not found")) {
        setError(err.message || "Failed to load validation result");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, applicationId, document._id]);

  const handleValidate = async () => {
    if (!token || !applicationId || !document._id) return;
    setIsValidating(true);
    setError("");
    try {
      const res = await validateDocument(token, applicationId, document._id);
      setValidation(res.validation);
    } catch (err: any) {
      setError(err.message || "Failed to validate document");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRevalidate = async () => {
    if (!token || !applicationId || !document._id) return;
    setIsValidating(true);
    setError("");
    try {
      const res = await revalidateDocument(token, applicationId, document._id);
      setValidation(res.validation);
    } catch (err: any) {
      setError(err.message || "Failed to revalidate document");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  const toggleFinding = (findingId: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  if (!validation && !isLoading && !isValidating) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#131b2e] mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            No Validation Result Yet
          </h3>
          <p className="text-sm text-[#5b403d] mb-4 max-w-md mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
            Run validation to compare the extracted document information with your application data and checklist requirements.
          </p>
          {!isReadOnly && document.extraction?.status === "COMPLETED" && document.classification?.status === "COMPLETED" && (
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-5 py-2.5 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Run Validation
                </>
              )}
            </button>
          )}
          {isReadOnly && (
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              Validation can be initiated from the document management interface.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !validation) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!validation) return null;

  const overallConfig = getOverallStatusConfig(validation.overallStatus);

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#e2e8f0] bg-[#fafbfc]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <h3 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Document Validation Results
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border ${overallConfig.bg} ${overallConfig.text}`}>
                {overallConfig.icon}
                {overallConfig.label}
              </span>
              <span className="text-xs text-[#94a3b8] px-2 py-0.5 bg-[#f1f5f9] rounded font-mono">
                Engine v{validation.engineVersion} • Rules v{validation.ruleSetVersion}
              </span>
            </div>
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              Document: <span className="font-medium text-[#131b2e]">{document.originalFilename}</span> (v{document.version})
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
              <span>Expected: <span className="font-mono text-[#131b2e]">{validation.expectedRequirementId}</span></span>
              {validation.predictedRequirementId && (
                <span>Predicted: <span className="font-mono text-[#131b2e]">{validation.predictedRequirementId}</span></span>
              )}
              <span>Validated: {new Date(validation.validatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleRevalidate}
              disabled={isValidating}
              className="px-3 py-1.5 text-xs font-semibold text-[#b91c1c] border border-[#b91c1c] hover:bg-[#fef2f2] rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <svg className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isValidating ? "Revalidating..." : "Revalidate"}
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-5 border-b border-[#f1f5f9] bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Findings"
            value={validation.findings.length}
            color="slate"
          />
          <StatCard
            label="Passed"
            value={validation.findings.filter(f => f.status === "passed").length}
            color="green"
          />
          <StatCard
            label="Mismatches"
            value={validation.findings.filter(f => f.status === "mismatch_found").length}
            color="red"
          />
          <StatCard
            label="Need Review"
            value={validation.findings.filter(f => f.status === "needs_review").length}
            color="amber"
          />
        </div>
      </div>

      {/* Findings List */}
      <div className="p-5 max-h-[60vh] overflow-y-auto">
        {validation.findings.length === 0 ? (
          <div className="text-center py-8 text-[#5b403d]">
            <p className="text-sm">No validation findings available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validation.findings.map((finding) => {
              const findingConfig = getFindingStatusConfig(finding.status);
              const isExpanded = expandedFindings.has(finding.findingId);

              return (
                <div
                  key={finding.findingId}
                  className={`p-4 rounded-lg border transition-colors ${
                    finding.isRequired
                      ? "border-[#e2e8f0] bg-white shadow-sm"
                      : "border-[#f1f5f9] bg-[#fafbfc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
                          {finding.fieldName}
                        </h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${findingConfig.bg} ${findingConfig.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${findingConfig.dot}`} />
                          {findingConfig.label}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${finding.isRequired ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
                          {finding.isRequired ? "MANDATORY" : "OPTIONAL"}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
                          {getComparisonMethodLabel(finding.comparisonMethod)}
                        </span>
                      </div>

                      <p className="text-xs text-[#5b403d] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
                        {finding.description}
                      </p>

                      <div className="text-[11px] text-[#5b403d] italic" style={{ fontFamily: "Inter, sans-serif" }}>
                        {finding.explanation}
                      </div>

                      {/* Expandable Details */}
                      {finding.confidence !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-[#94a3b8]">Confidence:</span>
                          <div className="flex-1 max-w-xs h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#b91c1c] rounded-full transition-all"
                              style={{ width: `${finding.confidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#131b2e]">{finding.confidence}%</span>
                        </div>
                      )}

                      <button
                        onClick={() => toggleFinding(finding.findingId)}
                        className="mt-2 text-xs text-[#b91c1c] hover:underline flex items-center gap-1"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        <span>{isExpanded ? "Hide Details" : "Show Details"}</span>
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-2 text-[11px] font-mono text-[#131b2e]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#5b403d]">Document Value:</span>
                            <span className="bg-[#f1f5f9] px-2 py-0.5 rounded break-all max-w-full">
                              {finding.documentValue !== null && finding.documentValue !== undefined
                                ? String(finding.documentValue)
                                : "<missing>"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#5b403d]">Application Value:</span>
                            <span className="bg-[#f1f5f9] px-2 py-0.5 rounded break-all max-w-full">
                              {finding.applicationValue !== null && finding.applicationValue !== undefined
                                ? String(finding.applicationValue)
                                : "<missing>"}
                            </span>
                          </div>
                          {finding.normalizedDocumentValue !== undefined && finding.normalizedDocumentValue !== null && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[#5b403d]">Normalized Doc:</span>
                              <span className="bg-green-50 px-2 py-0.5 rounded break-all max-w-full text-green-700">
                                {String(finding.normalizedDocumentValue)}
                              </span>
                            </div>
                          )}
                          {finding.normalizedApplicationValue !== undefined && finding.normalizedApplicationValue !== null && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[#5b403d]">Normalized App:</span>
                              <span className="bg-green-50 px-2 py-0.5 rounded break-all max-w-full text-green-700">
                                {String(finding.normalizedApplicationValue)}
                              </span>
                            </div>
                          )}
                          {finding.metadata && Object.keys(finding.metadata).length > 0 && (
                            <details className="group">
                              <summary className="cursor-pointer text-[#5b403d] hover:text-[#b91c1c] flex items-center gap-1">
                                <span>Metadata</span>
                                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-1 p-2 bg-[#f8fafc] rounded text-[10px] whitespace-pre-wrap">
                                {JSON.stringify(finding.metadata, null, 2)}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Required indicator */}
                    {finding.isRequired && (
                      <div className="shrink-0 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center" title="Mandatory check">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Processing Errors */}
        {validation.processingErrors && validation.processingErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-semibold text-red-700 mb-2">Processing Errors</h4>
            <ul className="text-xs text-red-600 space-y-1">
              {validation.processingErrors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800" style={{ fontFamily: "Inter, sans-serif" }}>
            <strong>Important:</strong> This validation compares extracted document data with application information for consistency checking only.
            It does not verify legal authenticity, guarantee regulatory compliance, or constitute official Fire Department approval.
            All findings require human review by authorized personnel.
          </p>
        </div>
      </div>
    </div>
  );
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

export default ValidationResults;