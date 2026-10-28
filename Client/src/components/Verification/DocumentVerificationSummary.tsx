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

    let uploaded = 0;
    let pendingReview = 0;
    let notUploaded = 0;
    let validationPassed = 0;
    let validationMismatch = 0;
    let validationNeedsReview = 0;
    let awaitingExtraction = 0;
    let awaitingClassification = 0;
    let awaitingValidation = 0;

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
        case "REJECTED":
          // Count verified/rejected as processed
          break;
      }

      // Text extraction status
      if (latestDoc.extraction) {
        if (latestDoc.extraction.status === "COMPLETED" || latestDoc.extraction.status === "PARTIAL") {
          // completed
        } else if (latestDoc.extraction.status === "PROCESSING" || latestDoc.extraction.status === "QUEUED") {
          awaitingExtraction++;
        } else {
          awaitingExtraction++;
        }
      } else {
        awaitingExtraction++;
      }

      // AI classification status
      if (latestDoc.classification) {
        if (latestDoc.classification.status === "COMPLETED") {
          // completed
        } else if (latestDoc.classification.status === "PROCESSING" || latestDoc.classification.status === "QUEUED") {
          awaitingClassification++;
        } else {
          awaitingClassification++;
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
        }
      } else if (latestDoc.classification?.status === "COMPLETED" && latestDoc.extraction?.status === "COMPLETED") {
        // Ready for validation but not yet validated
        awaitingValidation++;
      }
    }

    return {
      totalRequired: requiredDocItems.length,
      uploaded,
      pendingReview,
      notUploaded,
      validationPassed,
      validationMismatch,
      validationNeedsReview,
      awaitingExtraction,
      awaitingClassification,
      awaitingValidation,
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

      {/* Summary Stats - Key Metrics Only */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
          <StatCard label="Required" value={stats.totalRequired} color="slate" subtitle={stats.notUploaded > 0 ? `${stats.notUploaded} missing` : "All uploaded"} />
          <StatCard label="Uploaded" value={stats.uploaded} color="blue" subtitle={stats.notUploaded > 0 ? `${stats.notUploaded} remaining` : "Complete"} />
          <StatCard label="Missing" value={stats.notUploaded} color="red" subtitle="Required not uploaded" />
          <StatCard label="Validation Passed" value={stats.validationPassed} color="green" subtitle="All checks passed" />
          <StatCard label="Mismatches" value={stats.validationMismatch} color="red" subtitle="Needs attention" />
          <StatCard label="Needs Review" value={stats.validationNeedsReview} color="amber" subtitle="Ambiguous findings" />
          <StatCard label="Pending Review" value={stats.pendingReview} color="amber" subtitle="Awaiting inspector" />
          <StatCard label="Awaiting Processing" value={stats.awaitingExtraction + stats.awaitingClassification + stats.awaitingValidation} color="blue" subtitle="Extraction Classification Validation" />
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