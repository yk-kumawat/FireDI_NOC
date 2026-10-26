import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getChecklist,
  generateChecklist,
  updateChecklistItemResponse,
} from "../../services/checklistApi";
import type {
  Checklist,
  RequirementCategory,
  RawMaterialItem,
  FinishedGoodsItem,
} from "../../types/checklist";
import { RawMaterialsModal } from "./RawMaterialsModal";
import { FinishedGoodsModal } from "./FinishedGoodsModal";

interface ChecklistSectionProps {
  applicationId: string;
  isApplicationDraft: boolean;
}

const CATEGORY_TITLES: Record<RequirementCategory, string> = {
  COMMON: "1. Common Statutory Requirements",
  INDUSTRIAL: "2. Industrial Facility Requirements",
  EXISTING_BUILDING: "3. Existing Building Audit Requirements",
  HAZARDOUS_MATERIALS: "4. Hazardous Materials Approvals",
  BUILDING_SAFETY: "5. High-Rise Building Safety Clearances",
};

export const ChecklistSection = ({
  applicationId,
  isApplicationDraft,
}: ChecklistSectionProps) => {
  const { token } = useAuth();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState<"RAW_MATERIALS" | "FINISHED_GOODS" | null>(null);

  const fetchChecklistData = useCallback(async () => {
    if (!token || !applicationId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await getChecklist(token, applicationId);
      setChecklist(res.checklist);
    } catch (err: any) {
      setError(err.message || "Failed to load checklist");
    } finally {
      setIsLoading(false);
    }
  }, [token, applicationId]);

  useEffect(() => {
    fetchChecklistData();
  }, [fetchChecklistData]);

  const handleGenerate = async () => {
    if (!token || !applicationId) return;
    setIsGenerating(true);
    setError("");
    try {
      const res = await generateChecklist(token, applicationId);
      setChecklist(res.checklist);
      setSuccessMsg("Checklist generated successfully according to active rules.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to generate checklist");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMaterials = async (materials: RawMaterialItem[]) => {
    if (!token || !applicationId) return;
    const res = await updateChecklistItemResponse(
      token,
      applicationId,
      "REQ_RAW_MATERIALS",
      { materials }
    );
    setChecklist(res.checklist);
    setSuccessMsg("Raw materials inventory updated successfully.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleSaveGoods = async (goods: FinishedGoodsItem[]) => {
    if (!token || !applicationId) return;
    const res = await updateChecklistItemResponse(
      token,
      applicationId,
      "REQ_FINISHED_GOODS",
      { goods }
    );
    setChecklist(res.checklist);
    setSuccessMsg("Finished goods inventory updated successfully.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 mb-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not generated state
  if (!checklist) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 mb-6 text-center shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
        <div className="w-12 h-12 bg-red-50 text-[#b91c1c] rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3
          className="text-lg font-bold text-[#131b2e] mb-1"
          style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          Dynamic NOC Checklist Not Generated
        </h3>
        <p
          className="text-sm text-[#5b403d] max-w-lg mx-auto mb-5"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Evaluate your application's building classification, occupancy, and safety parameters against fire safety regulations to determine applicable document and information requirements.
        </p>

        {error && (
          <div className="mb-4 text-xs text-red-600 max-w-md mx-auto">{error}</div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Evaluating Rules...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate NOC Checklist
            </>
          )}
        </button>
      </div>
    );
  }

  // Calculate metrics
  const requiredItems = checklist.items.filter((it) => it.required);
  const completedRequired = requiredItems.filter((it) => it.status === "COMPLETED").length;
  const allCompleted = requiredItems.length > 0 && completedRequired === requiredItems.length;

  // Group items by category in a deterministic order
  const categoriesOrder: RequirementCategory[] = [
    "COMMON",
    "INDUSTRIAL",
    "EXISTING_BUILDING",
    "HAZARDOUS_MATERIALS",
    "BUILDING_SAFETY",
  ];

  const rawMaterialsItem = checklist.items.find((it) => it.requirementId === "REQ_RAW_MATERIALS");
  const finishedGoodsItem = checklist.items.find((it) => it.requirementId === "REQ_FINISHED_GOODS");

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] p-6 mb-6">
      {/* Toast notifications */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-green-600 hover:text-green-900">&times;</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">&times;</button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-[#f1f5f9]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2
              className="text-lg font-bold text-[#131b2e]"
              style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              Dynamic NOC Checklist Requirements
            </h2>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                allCompleted
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {allCompleted ? "COMPLETED" : "PENDING"}
            </span>
            <span className="text-xs text-[#94a3b8] px-2 py-0.5 bg-[#f1f5f9] rounded font-mono">
              Rule Set v{checklist.ruleSetVersion}
            </span>
          </div>
          <p className="text-xs text-[#5b403d]" style={{ fontFamily: "Inter, sans-serif" }}>
            {completedRequired} of {requiredItems.length} mandatory requirements fulfilled • Evaluated deterministically against active rules
          </p>
        </div>

        {isApplicationDraft && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            title="Re-evaluates requirements if building details were updated. Preserves all previously entered responses."
            className="px-3.5 py-1.5 text-xs font-semibold text-[#b91c1c] border border-[#b91c1c] hover:bg-[#fef2f2] rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <svg
              className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isGenerating ? "Refreshing..." : "Refresh Checklist"}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="py-4 border-b border-[#f1f5f9]">
        <div className="flex justify-between text-xs text-[#5b403d] mb-1 font-medium">
          <span>Requirement Fulfillment Progress</span>
          <span>
            {requiredItems.length > 0
              ? Math.round((completedRequired / requiredItems.length) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="w-full bg-[#f1f5f9] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              allCompleted ? "bg-green-600" : "bg-[#b91c1c]"
            }`}
            style={{
              width: `${
                requiredItems.length > 0
                  ? (completedRequired / requiredItems.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Categorized Requirements */}
      <div className="space-y-6 pt-5">
        {categoriesOrder.map((catKey) => {
          const itemsInCat = checklist.items.filter((it) => it.category === catKey);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={catKey} className="space-y-3">
              <h3
                className="text-sm font-bold text-[#131b2e] flex items-center gap-2 uppercase tracking-wider text-xs text-[#475569]"
                style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                <span>{CATEGORY_TITLES[catKey]}</span>
                <span className="text-[11px] font-normal text-[#94a3b8]">
                  ({itemsInCat.length} {itemsInCat.length === 1 ? "item" : "items"})
                </span>
              </h3>

              <div className="space-y-2.5">
                {itemsInCat.map((item) => (
                  <div
                    key={item.requirementId}
                    className="p-4 rounded-lg border border-[#e2e8f0] bg-[#fafbfc] hover:border-[#cbd5e1] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4
                            className="text-sm font-semibold text-[#131b2e]"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {item.name}
                          </h4>

                          {/* Requirement Type Badge */}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              item.type === "INFORMATION"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.type}
                          </span>

                          {/* Mandatory vs Optional Badge */}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                              item.required
                                ? "bg-slate-200 text-slate-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.required ? "MANDATORY" : "OPTIONAL"}
                          </span>

                          {/* Completion Status */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              item.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === "COMPLETED"
                                  ? "bg-green-600"
                                  : "bg-amber-600"
                              }`}
                            />
                            {item.status}
                          </span>
                        </div>

                        <p
                          className="text-xs text-[#5b403d] leading-relaxed mb-2"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {item.description}
                        </p>

                        {/* Applicability Reason & Source */}
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#64748b]">
                          <span className="flex items-center gap-1">
                            <strong className="text-[#475569]">Rule Reason:</strong>{" "}
                            {item.applicableReason}
                          </span>
                          <span>•</span>
                          <span className="italic">{item.sourceReference}</span>
                        </div>
                      </div>

                      {/* Action for Information Requirements */}
                      {item.type === "INFORMATION" && (
                        <div className="shrink-0 pt-1">
                          {item.requirementId === "REQ_RAW_MATERIALS" && (
                            <button
                              type="button"
                              onClick={() => setActiveModal("RAW_MATERIALS")}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#b91c1c] text-white hover:bg-[#991b1b] rounded-lg transition-colors shadow-sm"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              {item.status === "COMPLETED"
                                ? isApplicationDraft
                                  ? "Edit Materials"
                                  : "View Materials"
                                : "Provide Details"}
                            </button>
                          )}

                          {item.requirementId === "REQ_FINISHED_GOODS" && (
                            <button
                              type="button"
                              onClick={() => setActiveModal("FINISHED_GOODS")}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#b91c1c] text-white hover:bg-[#991b1b] rounded-lg transition-colors shadow-sm"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              {item.status === "COMPLETED"
                                ? isApplicationDraft
                                  ? "Edit Goods"
                                  : "View Goods"
                                : "Provide Details"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preview of entered response data */}
                    {item.requirementId === "REQ_RAW_MATERIALS" &&
                      item.response?.materials &&
                      item.response.materials.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                          <p className="text-[11px] font-semibold text-[#475569] mb-1.5">
                            Recorded Raw Materials ({item.response.materials.length}):
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-white rounded border border-[#e2e8f0]">
                              <thead className="bg-[#f8fafc] text-[#5b403d]">
                                <tr>
                                  <th className="px-2.5 py-1.5">Material</th>
                                  <th className="px-2.5 py-1.5">Quantity</th>
                                  <th className="px-2.5 py-1.5">Storage Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f1f5f9]">
                                {item.response.materials.map((m, idx) => (
                                  <tr key={idx}>
                                    <td className="px-2.5 py-1.5 font-medium text-[#131b2e]">
                                      {m.name}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-[#5b403d]">
                                      {m.quantity} {m.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-[#5b403d]">
                                      {m.storageLocation}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {item.requirementId === "REQ_FINISHED_GOODS" &&
                      item.response?.goods &&
                      item.response.goods.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                          <p className="text-[11px] font-semibold text-[#475569] mb-1.5">
                            Recorded Finished Goods ({item.response.goods.length}):
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-white rounded border border-[#e2e8f0]">
                              <thead className="bg-[#f8fafc] text-[#5b403d]">
                                <tr>
                                  <th className="px-2.5 py-1.5">Product / Goods</th>
                                  <th className="px-2.5 py-1.5">Quantity</th>
                                  <th className="px-2.5 py-1.5">Storage Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f1f5f9]">
                                {item.response.goods.map((g, idx) => (
                                  <tr key={idx}>
                                    <td className="px-2.5 py-1.5 font-medium text-[#131b2e]">
                                      {g.name}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-[#5b403d]">
                                      {g.quantity} {g.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-[#5b403d]">
                                      {g.storageLocation}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw Materials Modal */}
      <RawMaterialsModal
        isOpen={activeModal === "RAW_MATERIALS"}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveMaterials}
        initialMaterials={rawMaterialsItem?.response?.materials}
        isReadOnly={!isApplicationDraft}
      />

      {/* Finished Goods Modal */}
      <FinishedGoodsModal
        isOpen={activeModal === "FINISHED_GOODS"}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveGoods}
        initialGoods={finishedGoodsItem?.response?.goods}
        isReadOnly={!isApplicationDraft}
      />
    </div>
  );
};
