import type {
  Document,
  DocumentVerificationStatus,
  ValidationOverallStatus,
  ValidationFindingStatus,
  ReviewStatus,
} from "../types/checklist";

export const getVerificationStatusConfig = (status: DocumentVerificationStatus) => {
  const configs: Record<DocumentVerificationStatus, { bg: string; text: string; label: string }> = {
    NOT_STARTED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Uploaded" },
    PENDING_REVIEW: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Review" },
    VERIFIED: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  };
  return configs[status] || configs.NOT_STARTED;
};

export const getValidationStatusConfig = (status: ValidationOverallStatus | "not_validated") => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    passed: { bg: "bg-green-100", text: "text-green-700", label: "Validation Passed" },
    mismatch_found: { bg: "bg-red-100", text: "text-red-700", label: "Mismatch Found" },
    needs_review: { bg: "bg-amber-100", text: "text-amber-700", label: "Needs Review" },
    insufficient_data: { bg: "bg-blue-100", text: "text-blue-700", label: "Insufficient Data" },
    category_mismatch: { bg: "bg-orange-100", text: "text-orange-700", label: "Category Mismatch" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Validation Failed" },
    not_validated: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Validated" },
  };
  return configs[status] || configs.not_validated;
};

export const getFindingStatusConfig = (status: ValidationFindingStatus | ReviewStatus) => {
  const configs: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    passed: { bg: "bg-green-100", text: "text-green-700", label: "Passed", dot: "bg-green-500" },
    mismatch_found: { bg: "bg-red-100", text: "text-red-700", label: "Mismatch", dot: "bg-red-500" },
    needs_review: { bg: "bg-amber-100", text: "text-amber-700", label: "Needs Review", dot: "bg-amber-500" },
    insufficient_data: { bg: "bg-blue-100", text: "text-blue-700", label: "Insufficient Data", dot: "bg-blue-500" },
    not_applicable: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Applicable", dot: "bg-slate-500" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed", dot: "bg-red-500" },
    category_mismatch: { bg: "bg-orange-100", text: "text-orange-700", label: "Category Mismatch", dot: "bg-orange-500" },
    NOT_REVIEWED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Reviewed", dot: "bg-slate-500" },
    IN_REVIEW: { bg: "bg-blue-100", text: "text-blue-700", label: "In Review", dot: "bg-blue-500" },
    REVIEWED: { bg: "bg-green-100", text: "text-green-700", label: "Reviewed", dot: "bg-green-500" },
    FLAGGED_FOR_CORRECTION: { bg: "bg-amber-100", text: "text-amber-700", label: "Flagged for Correction", dot: "bg-amber-500" },
  };
  return configs[status] || configs.NOT_REVIEWED;
};

export const getProcessingStatusConfig = (status: Document["processingStatus"]) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    UPLOADED: { bg: "bg-blue-100", text: "text-blue-700", label: "Uploaded" },
    PROCESSING: { bg: "bg-amber-100", text: "text-amber-700", label: "Processing" },
    PROCESSED: { bg: "bg-green-100", text: "text-green-700", label: "Processed" },
    FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  };
  return configs[status] || configs.UPLOADED;
};

export const getExtractionStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    NOT_STARTED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Started" },
    QUEUED: { bg: "bg-blue-100", text: "text-blue-700", label: "Queued" },
    PROCESSING: { bg: "bg-amber-100", text: "text-amber-700", label: "Processing" },
    COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
    PARTIAL: { bg: "bg-orange-100", text: "text-orange-700", label: "Partial" },
    FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  };
  return configs[status] || configs.NOT_STARTED;
};

export const getClassificationStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    NOT_STARTED: { bg: "bg-slate-100", text: "text-slate-700", label: "Not Started" },
    QUEUED: { bg: "bg-blue-100", text: "text-blue-700", label: "Queued" },
    PROCESSING: { bg: "bg-amber-100", text: "text-amber-700", label: "Processing" },
    COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
    FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  };
  return configs[status] || configs.NOT_STARTED;
};

export const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    NOT_UPLOADED: { label: "Not Uploaded", color: "bg-slate-100 text-slate-700" },
    UPLOADED: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
    PROCESSING: { label: "Processing", color: "bg-amber-100 text-amber-700" },
    EXTRACTING: { label: "Extracting Text", color: "bg-purple-100 text-purple-700" },
    EXTRACTION_FAILED: { label: "Extraction Failed", color: "bg-red-100 text-red-700" },
    CLASSIFYING: { label: "Classifying", color: "bg-indigo-100 text-indigo-700" },
    CLASSIFICATION_FAILED: { label: "Classification Failed", color: "bg-red-100 text-red-700" },
    VALIDATED: { label: "Validated", color: "bg-green-100 text-green-700" },
    VERIFICATION: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  };
  return configs[status] || configs.NOT_UPLOADED;
};

export const getItemStatusConfig = (latestDoc: Document | null) => {
  if (!latestDoc) {
    return { status: "NOT_UPLOADED" as const, doc: null };
  }

  if (latestDoc.processingStatus === "PROCESSING") {
    return { status: "PROCESSING" as const, doc: latestDoc };
  }

  if (latestDoc.extraction && (latestDoc.extraction.status === "PROCESSING" || latestDoc.extraction.status === "QUEUED")) {
    return { status: "EXTRACTING" as const, doc: latestDoc };
  }
  if (latestDoc.extraction && latestDoc.extraction.status === "FAILED") {
    return { status: "EXTRACTION_FAILED" as const, doc: latestDoc };
  }

  if (latestDoc.classification && (latestDoc.classification.status === "PROCESSING" || latestDoc.classification.status === "QUEUED")) {
    return { status: "CLASSIFYING" as const, doc: latestDoc };
  }
  if (latestDoc.classification && latestDoc.classification.status === "FAILED") {
    return { status: "CLASSIFICATION_FAILED" as const, doc: latestDoc };
  }

  if (latestDoc.validation) {
    return { status: "VALIDATED" as const, doc: latestDoc };
  }

  if (latestDoc.verificationStatus !== "NOT_STARTED") {
    return { status: "VERIFICATION" as const, doc: latestDoc };
  }

  return { status: "UPLOADED" as const, doc: latestDoc };
};