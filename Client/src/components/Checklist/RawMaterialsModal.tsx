import { useState } from "react";
import type { RawMaterialItem } from "../../types/checklist";

interface RawMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materials: RawMaterialItem[]) => Promise<void>;
  initialMaterials?: RawMaterialItem[];
  isReadOnly?: boolean;
}

export const RawMaterialsModal = ({
  isOpen,
  onClose,
  onSave,
  initialMaterials = [],
  isReadOnly = false,
}: RawMaterialsModalProps) => {
  const [materials, setMaterials] = useState<RawMaterialItem[]>(
    initialMaterials.length > 0
      ? initialMaterials
      : [{ name: "", quantity: 0, unit: "kg", storageLocation: "" }]
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleRowChange = (
    index: number,
    field: keyof RawMaterialItem,
    value: string | number
  ) => {
    setMaterials((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = () => {
    setMaterials((prev) => [
      ...prev,
      { name: "", quantity: 0, unit: "kg", storageLocation: "" },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (materials.length <= 1) return;
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError("");

    // Validate
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      if (!m.name.trim()) {
        setError(`Row ${i + 1}: Material name is required`);
        return;
      }
      if (m.quantity == null || Number(m.quantity) < 0) {
        setError(`Row ${i + 1}: Quantity must be a valid non-negative number`);
        return;
      }
      if (!m.unit.trim()) {
        setError(`Row ${i + 1}: Unit is required`);
        return;
      }
      if (!m.storageLocation.trim()) {
        setError(`Row ${i + 1}: Storage location is required`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(materials);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save raw materials");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e2e8f0]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3
              className="text-lg font-bold text-[#131b2e]"
              style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              Raw Materials &amp; Storage Locations
            </h3>
            <p
              className="text-xs text-[#5b403d] mt-0.5"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              List all manufacturing inputs, fuels (LPG, diesel), and designated storage areas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#131b2e] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {error}
            </div>
          )}

          <div className="space-y-3">
            {materials.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#5b403d] mb-1">
                    Material Name *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Toluene, LPG, Steel Coils"
                    value={item.name}
                    onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#e2e8f0] rounded bg-white text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#b91c1c]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#5b403d] mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      handleRowChange(idx, "quantity", Number(e.target.value))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#e2e8f0] rounded bg-white text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#b91c1c]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#5b403d] mb-1">
                    Unit *
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={item.unit}
                    onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-[#e2e8f0] rounded bg-white text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#b91c1c]"
                  >
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="litres">litres</option>
                    <option value="cylinders">cylinders</option>
                    <option value="kL">kL</option>
                    <option value="barrels">barrels</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#5b403d] mb-1">
                    Storage Location *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Tank Farm A, Yard 1"
                    value={item.storageLocation}
                    onChange={(e) =>
                      handleRowChange(idx, "storageLocation", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#e2e8f0] rounded bg-white text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#b91c1c]"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-3">
                  {!isReadOnly && materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-[#b91c1c] hover:text-[#991b1b] flex items-center gap-1.5 mt-2"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Raw Material
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex justify-end gap-3 bg-[#fafafa] rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5b403d] hover:bg-[#e2e8f0] rounded-lg transition-colors"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {isReadOnly ? "Close" : "Cancel"}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-lg transition-colors shadow-sm disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isSaving ? "Saving..." : "Save Raw Materials"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
