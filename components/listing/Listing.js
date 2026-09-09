"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { Actions } from "@/components/ui/Actions";
import { Filters } from "@/components/ui/Filters";
import RecordModal from "@/components/ui/RecordModal";
import { exportToExcel } from "@/lib/exportToExcel";
import { triggerAutoSyncToGoogleSheets } from "@/google_sheets_sync/syncClient";
import "@/components/ui/ui.css";
import "./listing.css";

/**
 * Generic Table Listing Component
 * Used for: Suppliers, Products, Purchases
 */
export default function Listing({ type, title, data = [], heads }) {
  const storageKey = `pdv_app_${type}`;
  const isPurchase = type === "purchases";

  // 1. Component State
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [modal, setModal] = useState({ isOpen: false, mode: "add", record: null, index: null });

  // Singular entity name (e.g. "Supplier", "Product")
  const entityName = type === "suppliers" ? "Supplier" : type === "products" ? "Product" : "Purchase";

  // 2. Load stored records on initial mount
  useEffect(() => {
    try {
      // Clear legacy storage cache
      localStorage.removeItem(`materialflow_real_${type}`);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          setRecords(saved);
          return;
        }
      }
      setRecords([]);
    } catch (e) {
      console.warn("Failed to load records:", e);
      setRecords([]);
    }
  }, [storageKey]);

  // Save records helper
  const saveRecords = (newList) => {
    setRecords(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
    // ⚡ Real-Time Auto-Upload to Google Sheets
    triggerAutoSyncToGoogleSheets();
  };

  // 3. Modal open helpers
  const handleOpenAdd = () => {
    const nextCode = `${type === "suppliers" ? "SUP" : "PRD"}-${String(records.length + 1).padStart(3, "0")}`;
    const emptyRow = heads.map((h, i) => (i === 0 ? nextCode : h.toLowerCase().includes("status") ? "Active" : ""));
    setModal({ isOpen: true, mode: "add", record: emptyRow, index: null });
  };

  const handleModalSave = (formValues) => {
    if (modal.mode === "add") {
      saveRecords([formValues, ...records]);
    } else if (modal.mode === "edit" && modal.index !== null) {
      const copy = [...records];
      copy[modal.index] = formValues;
      saveRecords(copy);
    }
  };

  const handleDelete = (index) => {
    saveRecords(records.filter((_, i) => i !== index));
  };

  // 4. Filter records based on search and status
  const filteredRecords = records.filter((row) => {
    const matchesSearch = !search || row.some((c) => String(c).toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = status === "All Status" || String(row[row.length - 1]).toLowerCase() === status.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <Shell>
      {/* Header */}
      <Title
        title={title}
        desc={`Manage your ${title.toLowerCase()} records.`}
        action={
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              onClick={() => exportToExcel({ filename: title, headers: heads, rows: records })}
            >
              ⤓ Export to Excel
            </button>

            {isPurchase ? (
              <Link href="/purchases/new" className="primary">+ New Purchase</Link>
            ) : (
              <button type="button" className="primary" onClick={handleOpenAdd}>+ Add {entityName}</button>
            )}
          </div>
        }
      />

      {/* Table Card */}
      <section className="card tableCard">
        <div className="tableControls">
          <Filters
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            onClear={() => { setSearch(""); setStatus("All Status"); }}
          />
          <div className="tableStats">
            <span>Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records</span>
          </div>
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                {heads.map((h) => <th key={h}>{h}</th>)}
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={heads.length + 1} className="emptyTable">
                    <p>No {title.toLowerCase()} found.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row, i) => (
                  <tr key={i}>
                    {row.map((val, colIndex) => (
                      <td key={colIndex}>
                        {colIndex === row.length - 1 ? <Badge>{val}</Badge> : val}
                      </td>
                    ))}
                    <td>
                      <Actions
                        onView={() => setModal({ isOpen: true, mode: "view", record: row, index: i })}
                        onEdit={() => setModal({ isOpen: true, mode: "edit", record: row, index: i })}
                        onDelete={() => setModal({ isOpen: true, mode: "delete", record: row, index: i })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Dialog */}
      <RecordModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        entityName={entityName}
        heads={heads}
        initialData={modal.record}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onSave={handleModalSave}
        onConfirmDelete={() => handleDelete(modal.index)}
      />
    </Shell>
  );
}
