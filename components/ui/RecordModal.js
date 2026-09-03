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

  // 2. Add / Edit / View Dialog
  const isView = mode === "view";
  const modalTitle = mode === "add" ? `Add ${entityName}` : mode === "edit" ? `Edit ${entityName}` : `${entityName} Details`;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>{modalTitle}</h3>
          <button type="button" className="modalCloseBtn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalBody gridBody">
            {heads.map((head, index) => {
              const val = formData[index] || "";
              const isStatus = head.toLowerCase().includes("status");

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
                    <select value={val || "Active"} onChange={(e) => handleFieldChange(index, e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
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
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
