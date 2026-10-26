import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { getChecklist } from "../../services/checklistApi";
import { listDocuments } from "../../services/documentApi";
import type {
  Checklist,
  Document,
  RequirementCategory,
} from "../../types/checklist";
import { CategorySection } from "./CategorySection";
import { InformationRequirementsNote } from "./InformationRequirementsNote";
import { StatCard } from "./StatCard";

interface DocumentVerificationSummaryProps {
  applicationId: string;
  isApplicationDraft: boolean;
}

export const DocumentVerificationSummary = ({
  applicationId,
  isApplicationDraft,
}: DocumentVerificationSummaryProps) => {
  const { token } = useAuth();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [documentsMap, setDocumentsMap] = useState<Record<string, Document[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!token || !applicationId) return;
    setIsLoading(true);
    setError("");
    try {
      const checklistRes = await getChecklist(token, applicationId);
      setChecklist(checklistRes.checklist);

      if (checklistRes.checklist) {
        const docRequirements = checklistRes.checklist.items.filter(
          (item) => item.type === "DOCUMENT"
        );

        const docsMap: Record<string, Document[]> = {};
        await Promise.all(
          docRequirements.map(async (item) => {
            try {
              const res = await listDocuments(token, applicationId, item.requirementId);
              docsMap[item.requirementId] = res.documents;
            } catch (err) {
              console.error(`Failed to load documents for ${item.requirementId}:`, err);
              docsMap[item.requirementId] = [];
            }
          })
        );
        setDocumentsMap(docsMap);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load verification summary");
    } finally {
      setIsLoading(false);
    }
  }, [token, applicationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSummaryStats = () => {
    if (!checklist) return null;

    const docItems = checklist.items.filter((item) => item.type === "DOCUMENT");
    const requiredDocItems = docItems.filter((item) => item.required);
    const optionalDocItems = docItems.filter((item) => !item.required);
    const infoItems = checklist.items.filter((item) => item.type === "INFORMATION");

    let uploaded = 0;
    let pendingReview = 0;
    let verified = 0;
    let rejected = 0;
    let notUploaded = 0;
    let optionalUploaded = 0;
    let optionalNotUploaded = 0;
    let validationPassed = 0;
    let validationMismatch = 0;
    let validationNeedsReview = 0;
    let validationInsufficientData = 0;
    let validationCategoryMismatch = 0;
    let validationFailed = 0;
    let awaitingExtraction = 0;
    let awaitingClassification = 0;
    let awaitingValidation = 0;
    let extractionCompleted = 0;
    let classificationCompleted = 0;
    let extractionFailed = 0;
    let classificationFailed = 0;

    for (const item of requiredDocItems) {
      const docs = documentsMap[item.requirementId] || [];
      const latestDoc = docs[0];

      if (!latestDoc) {
        notUploaded++;
        continue;
      }

      uploaded++;

      switch (latestDoc.verificationStatus) {
        case "PENDING_REVIEW":
          pendingReview++;
          break;
        case "VERIFIED":
          verified++;
          break;
        case "REJECTED":
          rejected++;
          break;
      }

      // Processing pipeline status
      if (latestDoc.processingStatus === "PROCESSING" || latestDoc.processingStatus === "UPLOADED") {
        awaitingValidation++;
      }

      // Text extraction status
      if (latestDoc.extraction) {
        if (latestDoc.extraction.status === "COMPLETED" || latestDoc.extraction.status === "PARTIAL") {
          extractionCompleted++;
        } else if (latestDoc.extraction.status === "PROCESSING" || latestDoc.extraction.status === "QUEUED") {
          awaitingExtraction++;
        } else if (latestDoc.extraction.status === "FAILED") {
          extractionFailed++;
        }
      } else {
        awaitingExtraction++;
      }

      // AI classification status
      if (latestDoc.classification) {
        if (latestDoc.classification.status === "COMPLETED") {
          classificationCompleted++;
        } else if (latestDoc.classification.status === "PROCESSING" || latestDoc.classification.status === "QUEUED") {
          awaitingClassification++;
        } else if (latestDoc.classification.status === "FAILED") {
          classificationFailed++;
        }
      } else {
        awaitingClassification++;
      }

      // Validation status
      if (latestDoc.validation) {
        switch (latestDoc.validation.overallStatus) {
          case "passed":
            validationPassed++;
            break;
          case "mismatch_found":
            validationMismatch++;
            break;
          case "needs_review":
            validationNeedsReview++;
            break;
          case "insufficient_data":
            validationInsufficientData++;
            break;
          case "category_mismatch":
            validationCategoryMismatch++;
            break;
          case "failed":
            validationFailed++;
            break;
        }
      } else if (latestDoc.classification?.status === "COMPLETED" && latestDoc.extraction?.status === "COMPLETED") {
        // Ready for validation but not yet validated
        awaitingValidation++;
      }
    }

    // Optional documents
    for (const item of optionalDocItems) {
      const docs = documentsMap[item.requirementId] || [];
      const latestDoc = docs[0];
      if (latestDoc) {
        optionalUploaded++;
      } else {
        optionalNotUploaded++;
      }
    }

    return {
      totalRequired: requiredDocItems.length,
      totalOptional: optionalDocItems.length,
      totalInfo: infoItems.length,
      uploaded,
      optionalUploaded,
      optionalNotUploaded,
      pendingReview,
      verified,
      rejected,
      notUploaded,
      validationPassed,
      validationMismatch,
      validationNeedsReview,
      validationInsufficientData,
      validationCategoryMismatch,
      validationFailed,
      awaitingExtraction,
      awaitingClassification,
      awaitingValidation,
      extractionCompleted,
      classificationCompleted,
      extractionFailed,
      classificationFailed,
    };
  };

  const stats = getSummaryStats();

  const categoriesOrder: RequirementCategory[] = [
    "COMMON",
    "INDUSTRIAL",
    "EXISTING_BUILDING",
    "HAZARDOUS_MATERIALS",
    "BUILDING_SAFETY",
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 mb-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 mb-6 text-center">
        <p className="text-sm text-[#5b403d]">Checklist not generated yet</p>
      </div>
    );
  }

  const docItems = checklist.items.filter((item) => item.type === "DOCUMENT");
  const infoItems = checklist.items.filter((item) => item.type === "INFORMATION");

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-[#f1f5f9] mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <h2 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Document Verification Progress
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200" style={{ fontFamily: "Inter, sans-serif" }}>
              DOCUMENT REQUIREMENTS
            </span>
            <span className="text-xs text-[#94a3b8] px-2 py-0.5 bg-[#f1f5f9] rounded font-mono">
              Rule Set v{checklist.ruleSetVersion}
            </span>
          </div>
          <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
            {docItems.length} document requirements • {infoItems.length} information requirements
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="space-y-4 mb-5">
          {/* Row 1: Document Requirements Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Required Docs" value={stats.totalRequired} color="slate" subtitle={stats.notUploaded > 0 ? `${stats.notUploaded} missing` : "All uploaded"} />
            <StatCard label="Uploaded" value={stats.uploaded} color="blue" subtitle={stats.uploaded === stats.totalRequired && stats.totalRequired > 0 ? "Complete" : "In progress"} />
            <StatCard label="Optional Docs" value={stats.totalOptional} color="purple" subtitle={`${stats.optionalUploaded} uploaded`} />
            <StatCard label="Info Requirements" value={stats.totalInfo} color="purple" subtitle="No upload needed" />
            <StatCard label="Awaiting Extraction" value={stats.awaitingExtraction} color="amber" subtitle={stats.extractionFailed > 0 ? `${stats.extractionFailed} failed` : undefined} />
            <StatCard label="Awaiting Classification" value={stats.awaitingClassification} color="amber" subtitle={stats.classificationFailed > 0 ? `${stats.classificationFailed} failed` : undefined} />
            <StatCard label="Ready for Validation" value={stats.awaitingValidation} color="blue" subtitle={stats.validationPassed + stats.validationMismatch + stats.validationNeedsReview + stats.validationInsufficientData + stats.validationCategoryMismatch + stats.validationFailed > 0 ? "Some validated" : undefined} />
          </div>

          {/* Row 2: Verification & Validation Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label="Extraction Done" value={stats.extractionCompleted} color="green" subtitle={stats.extractionCompleted === stats.uploaded && stats.uploaded > 0 ? "All complete" : undefined} />
            <StatCard label="Classification Done" value={stats.classificationCompleted} color="green" subtitle={stats.classificationCompleted === stats.uploaded && stats.uploaded > 0 ? "All complete" : undefined} />
            <StatCard label="Verified" value={stats.verified} color="green" subtitle="Inspector verified" />
            <StatCard label="Pending Review" value={stats.pendingReview} color="amber" subtitle="Awaiting inspector" />
            <StatCard label="Rejected" value={stats.rejected} color="red" subtitle="Needs correction" />
            <StatCard label="Validation Passed" value={stats.validationPassed} color="green" subtitle="All checks passed" />
            <StatCard label="Mismatches" value={stats.validationMismatch} color="red" subtitle="Needs attention" />
            <StatCard label="Needs Review" value={stats.validationNeedsReview} color="amber" subtitle="Ambiguous findings" />
          </div>

          {/* Row 3: Validation Issues Detail */}
          {(stats.validationInsufficientData > 0 || stats.validationCategoryMismatch > 0 || stats.validationFailed > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard label="Insufficient Data" value={stats.validationInsufficientData} color="blue" subtitle="Missing fields" />
              <StatCard label="Category Mismatch" value={stats.validationCategoryMismatch} color="orange" subtitle="Wrong doc type" />
              <StatCard label="Validation Failed" value={stats.validationFailed} color="red" subtitle="Processing error" />
              <StatCard label="Missing Required" value={stats.notUploaded} color="slate" subtitle="Not uploaded" />
            </div>
          )}
        </div>
      )}

      {/* Categorized Document Requirements */}
      <div className="space-y-6">
        {categoriesOrder.map((catKey) => {
          const itemsInCat = docItems.filter((it) => it.category === catKey);
          if (itemsInCat.length === 0) return null;

          return (
            <CategorySection
              key={catKey}
              catKey={catKey}
              items={itemsInCat}
              documentsMap={documentsMap}
              isApplicationDraft={isApplicationDraft}
            />
          );
        })}

        {infoItems.length > 0 && (
          <InformationRequirementsNote items={infoItems} />
        )}
      </div>
    </div>
  );
};

export default DocumentVerificationSummary;