"use client";

import { useState, useEffect } from "react";

/**
 * Simple Popup Modal for Adding, Editing, or Viewing a Record
 */
export default function RecordModal({
  isOpen,
  mode = "add", // "add" | "edit" | "view" | "delete"
  entityName = "Record",
  heads = [],
  initialData = null,
  onClose,
  onSave,
  onConfirmDelete,
}) {
  const [formData, setFormData] = useState([]);

  // Load record data into form inputs when modal opens
  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      setFormData([...initialData]);
    } else {
      // Create empty fields for new record
      setFormData(heads.map((h) => (h.toLowerCase().includes("status") ? "Active" : "")));
    }
  }, [initialData, heads, isOpen]);

  if (!isOpen) return null;

  // Input change handler
  const handleFieldChange = (index, value) => {
    const updated = [...formData];
    updated[index] = value;
    setFormData(updated);
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
    onClose();
  };

  // 1. Simple Delete Confirmation Dialog
  if (mode === "delete") {
    const itemName = formData[1] || formData[0] || `${entityName} item`;
    return (
      <div className="modalBackdrop" onClick={onClose}>
        <div className="modalContent deleteModal" onClick={(e) => e.stopPropagation()}>
          <div className="modalHeader dangerHeader">
            <h3>Delete {entityName}</h3>
            <button type="button" className="modalCloseBtn" onClick={onClose}>×</button>
          </div>
          <div className="modalBody">
            <p>Are you sure you want to delete <strong>{itemName}</strong>?</p>
          </div>
          <div className="modalFooter">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="removeBtn" onClick={() => { onConfirmDelete(); onClose(); }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Datalists / options for standard fields
  const categories = [
    "MDPE Material",
    "GI Material",
    "Tools & Equipment",
    "Safety Material",
    "Fittings & Accessories",
    "PDV Material",
    "General Material",
  ];

  const units = ["Nos", "Mtr", "Pairs", "Sets", "Kg", "Pcs", "Bag", "Pkt", "Roll"];

  const gstRates = ["18%", "12%", "5%", "0%", "28%"];

  const suppliersList = [
    "Vasu Enterprises",
    "ESSEMM Incorporation",
    "HP Steel Industries",
    "Nutan Trading Co.",
    "Chokhawala Distributors",
    "Alfa Hoses",
    "Sharansh Enterprises",
    "GGL FIM Kosi Kalan",
    "PDV Ganganagar",
    "PDV Goverdhan",
  ];

  // 2. Add / Edit / View Dialog
  const isView = mode === "view";
  const modalTitle = mode === "add" ? `Add New ${entityName}` : mode === "edit" ? `Edit ${entityName}` : `${entityName} Details`;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalContent" style={{ maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3>{modalTitle}</h3>
            <p>Fill in the details for all fields below.</p>
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalBody gridBody" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {heads.map((head, index) => {
              const val = formData[index] || "";
              const lower = head.toLowerCase();
              const isStatus = lower.includes("status");
              const isGst = lower.includes("gst");
              const isCategory = lower.includes("category") || lower.includes("head");
              const isUnit = lower.includes("unit");
              const isSupplier = lower.includes("supplier");
              const isDate = lower.includes("date");
              const isRate = lower.includes("rate") || lower.includes("amount") || lower.includes("qty") || lower.includes("reorder") || lower.includes("price");

              if (isView) {
                return (
                  <div key={head} className="viewField">
                    <span className="viewLabel">{head}</span>
                    <span className="viewValue">{val || "—"}</span>
                  </div>
                );
              }

              if (isStatus) {
                return (
                  <div key={head} className="formField">
                    <label>{head}</label>
                    <select value={val || (entityName === "Purchase" ? "Paid" : "Approved")} onChange={(e) => handleFieldChange(index, e.target.value)}>
                      <option value="Paid">Paid</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Issued">Issued</option>
                      <option value="Completed">Completed</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>
                );
              }

              if (isGst) {
                return (
                  <div key={head} className="formField">
                    <label>{head}</label>
                    <select value={val || "18%"} onChange={(e) => handleFieldChange(index, e.target.value)}>
                      {gstRates.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (isCategory) {
                return (
                  <div key={head} className="formField">
                    <label>{head}</label>
                    <input
                      type="text"
                      list="modalCatList"
                      placeholder="Select or enter category"
                      value={val}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                    />
                    <datalist id="modalCatList">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                );
              }

              if (isUnit) {
                return (
                  <div key={head} className="formField">
                    <label>{head}</label>
                    <input
                      type="text"
                      list="modalUnitList"
                      placeholder="e.g. Nos, Mtr"
                      value={val}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                    />
                    <datalist id="modalUnitList">
                      {units.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                );
              }

              if (isSupplier) {
                return (
                  <div key={head} className="formField">
                    <label>{head}</label>
                    <input
                      type="text"
                      list="modalSupplierList"
                      placeholder="Select or enter supplier"
                      value={val}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                    />
                    <datalist id="modalSupplierList">
                      {suppliersList.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                );
              }

              return (
                <div key={head} className="formField">
                  <label>{head}</label>
                  <input
                    type="text"
                    required={index === 1}
                    placeholder={`Enter ${head.toLowerCase()}`}
                    value={val}
                    onChange={(e) => handleFieldChange(index, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div className="modalFooter">
            <button type="button" className="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button type="submit" className="primary">
                Save Record
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
