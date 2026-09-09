"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { fields } from "@/data/fields";
import { triggerAutoSyncToGoogleSheets } from "@/google_sheets_sync/syncClient";
import History from "./History";
import "@/components/ui/ui.css";
import "./forms.css";

/**
 * Reusable Form for:
 * 1. New Purchase ("purchase") - All 100 columns from Row 1 of Mat PDV
 * 2. Material Issue ("issue") - All 92 columns from Row 1 of Mat Issued
 * 3. Material Consumption ("consumption")
 */
export default function Form({ kind, title }) {
  const router = useRouter();
  const isPurchase = kind === "purchase";
  const isIssue = kind === "issue";
  const allFieldList = fields[kind] || fields.purchase;

  // Split into voucher header fields and material columns
  const headerCutoff = isPurchase ? 13 : isIssue ? 5 : allFieldList.length;
  const headerFields = allFieldList.slice(0, headerCutoff);
  const materialFields = allFieldList.slice(headerCutoff);

  // Form State
  const [fieldValues, setFieldValues] = useState({});
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [searchMaterial, setSearchMaterial] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Field change handlers
  const handleFieldChange = (name, val) => {
    setFieldValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleMaterialQtyChange = (materialName, qty) => {
    setMaterialQuantities((prev) => ({ ...prev, [materialName]: qty }));
  };

  // Filter material fields by user search
  const filteredMaterials = materialFields.filter((m) =>
    m.toLowerCase().includes(searchMaterial.toLowerCase())
  );

  // Count filled materials
  const filledCount = Object.values(materialQuantities).filter((q) => q && Number(q) > 0).length;

  // Save form handler
  const handleSave = (e) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString("en-GB");

    if (isPurchase) {
      const invNumber =
        fieldValues["Invoice / Voucher No"] ||
        fieldValues["SR No"] ||
        `INV-${Date.now().toString().slice(-4)}`;

      const newPurchase = [
        invNumber,
        fieldValues["Invoice date"] || today,
        fieldValues["PURCHASE FROM"] || fieldValues["Location"] || "Direct Supplier",
        `QT-${Date.now().toString().slice(-3)}`,
        String(filledCount || 1),
        fieldValues["Total Amt with GST"] ? `₹ ${fieldValues["Total Amt with GST"]}` : (fieldValues["invoice value"] ? `₹ ${fieldValues["invoice value"]}` : "—"),
        "Approved",
      ];

      const existing = JSON.parse(localStorage.getItem("pdv_app_purchases") || "[]");
      localStorage.setItem("pdv_app_purchases", JSON.stringify([newPurchase, ...existing]));

      // ⚡ Real-Time Auto-Upload to Google Sheets
      triggerAutoSyncToGoogleSheets();

      setMessage(`✓ Purchase ${invNumber} saved and synced to Google Sheets! Redirecting...`);
      setTimeout(() => router.push("/purchases"), 1000);
    } else {
      const recordNumber =
        fieldValues["Mat issue / receive Challan No"] ||
        fieldValues["V / Sl. No"] ||
        fieldValues["Consumption No"] ||
        `${isIssue ? "MI" : "MC"}-${Date.now().toString().slice(-4)}`;

      const newRecord = {
        number: recordNumber,
        date: fieldValues["Date"] || fieldValues["Invoice date"] || today,
        department: fieldValues["Name - Material issued to"] || fieldValues["Department / Site"] || fieldValues["Location"] || "Main Site",
        itemsCount: filledCount || 1,
        status: fieldValues["Issue/return"] || "Issued",
      };

      const key = `pdv_app_${kind}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([newRecord, ...existing]));

      // ⚡ Real-Time Auto-Upload to Google Sheets
      triggerAutoSyncToGoogleSheets();

      setMessage(`✓ Record ${recordNumber} saved & synced to Google Sheets with ${filledCount} material quantities!`);
      setReloadKey((prev) => prev + 1);
      setFieldValues({});
      setMaterialQuantities({});
      setTimeout(() => setMessage(""), 3500);
    }
  };

  return (
    <Shell>
      <Title
        title={title}
        desc={`Record and track ${title.toLowerCase()} operations with all specifications from Row 1.`}
      />

      {message && (
        <div style={{ padding: "12px", background: "#ecfdf5", color: "#065f46", borderRadius: "8px", marginBottom: "16px", fontWeight: "bold" }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Header / Transaction Details */}
        <section className="card formCard">
          <div className="sectionHead">
            <h2>{isPurchase ? "Voucher / Purchase Details" : isIssue ? "Issue Voucher Details" : `${title} Details`}</h2>
          </div>
          <div className="formGrid">
            {headerFields.map((name) => (
              <label key={name}>
                {name}
                <input
                  type={name.toLowerCase().includes("date") ? "date" : "text"}
                  placeholder={`Enter ${name.toLowerCase()}`}
                  value={fieldValues[name] || ""}
                  onChange={(e) => handleFieldChange(name, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Section 2: Material Specifications & Quantities (All columns from Row 1) */}
        {materialFields.length > 0 && (
          <section className="card formCard" style={{ marginTop: "20px" }}>
            <div className="materialMatrixHead">
              <div>
                <h2>Material Specifications & Quantity Matrix</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                  All {materialFields.length} material columns from Row 1 ({filledCount} filled)
                </p>
              </div>

              <div className="matrixSearch">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Filter material (e.g. nipple, gutka, drill, fitting, clamp...)"
                  value={searchMaterial}
                  onChange={(e) => setSearchMaterial(e.target.value)}
                />
                {searchMaterial && (
                  <button type="button" onClick={() => setSearchMaterial("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#98a2b3" }}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="materialMatrixGrid">
              {filteredMaterials.map((matName) => {
                const qtyVal = materialQuantities[matName] || "";
                const isFilled = qtyVal !== "" && Number(qtyVal) > 0;
                return (
                  <div key={matName} className={`materialCell ${isFilled ? "filled" : ""}`}>
                    <div className="materialCellTitle">{matName}</div>
                    <div className="materialCellInput">
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={qtyVal}
                        onChange={(e) => handleMaterialQtyChange(matName, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 3: Action Buttons */}
        <section className="formActions" style={{ marginTop: "20px" }}>
          <button type="button" className="secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="primary">{isPurchase ? "Save Purchase" : "Save Record"}</button>
        </section>
      </form>

      {/* History table for Issue and Consumption */}
      {!isPurchase && <History kind={kind} title={`${title} History`} refreshTrigger={reloadKey} />}
    </Shell>
  );
}

