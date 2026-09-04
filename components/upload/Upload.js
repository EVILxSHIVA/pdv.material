"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";
import "@/components/ui/ui.css";
import "./upload.css";

/**
 * Upload Center for Soft Copies (PDFs/Images)
 * Select between: Tax Invoice or Proforma Invoice (PI)
 */
export default function Upload() {
  const storageKey = "pdv_app_bills";

  // 1. Form state
  const [billType, setBillType] = useState("Tax Invoice");
  const [billNumber, setBillNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [billDate, setBillDate] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState("");
  const [bills, setBills] = useState([]);
  const [message, setMessage] = useState("");

  // 2. Load stored bills on page load
  useEffect(() => {
    try {
      localStorage.removeItem("materialflow_real_bills");
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setBills(Array.isArray(saved) ? saved : []);
    } catch (e) {
      console.warn("Could not read bills:", e);
      setBills([]);
    }
  }, []);

  // Save bills list to state and localStorage
  const saveBills = (newList) => {
    setBills(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
  };

  // 3. File select helper (Strictly validates PDF format and converts to base64)
  const handleFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Strict PDF validation
    const isPdf =
      selected.type === "application/pdf" ||
      selected.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      alert("Only PDF files (.pdf) are allowed. Please select a valid PDF file.");
      e.target.value = "";
      setFile(null);
      setFileData("");
      return;
    }

    setFile(selected);

    const reader = new FileReader();
    reader.onload = () => setFileData(reader.result);
    reader.readAsDataURL(selected);
  };

  // 4. Save new bill
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please choose a PDF file to attach.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are allowed.");
      return;
    }

    const today = new Date().toLocaleDateString("en-GB");
    const newBill = {
      id: Date.now(),
      billType,
      billNumber: billNumber || `${billType === "Tax Invoice" ? "INV" : "PI"}-${Date.now().toString().slice(-4)}`,
      supplierName: supplierName || "Direct Vendor",
      billDate: billDate || today,
      amount: amount ? `₹ ${Number(amount).toLocaleString()}` : "—",
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileData,
    };

    saveBills([newBill, ...bills]);
    setMessage(`✓ ${billType} "${newBill.billNumber}" saved!`);

    // Reset inputs
    setBillNumber("");
    setSupplierName("");
    setBillDate("");
    setAmount("");
    setFile(null);
    setFileData("");
    setTimeout(() => setMessage(""), 3000);
  };

  // 5. Delete bill
  const handleDelete = (id) => {
    if (confirm("Delete this uploaded bill?")) {
      saveBills(bills.filter((b) => b.id !== id));
    }
  };

  // 6. Export bills to Excel
  const handleExport = () => {
    const headers = ["Type", "Number", "Supplier", "Date", "Amount", "File Name", "Size"];
    const rows = bills.map((b) => [b.billType, b.billNumber, b.supplierName, b.billDate, b.amount, b.fileName, b.fileSize]);
    exportToExcel({ filename: "Bills_Log", headers, rows });
  };

  return (
    <Shell>
      <Title title="Upload Bills & Invoices" desc="Upload PDF soft copies of Tax Invoices and Proforma Invoices (PI)." />

      {message && <div className="billSuccessBanner">{message}</div>}

      {/* Upload Form Card */}
      <section className="card formCard">
        <form onSubmit={handleSubmit}>
          {/* Document Type Selector */}
          <div className="billTypeSelector">
            <label className="typeSelectorLabel">Select Document Type:</label>
            <div className="typeButtonGroup">
              <button
                type="button"
                className={`typeButton ${billType === "Tax Invoice" ? "selected" : ""}`}
                onClick={() => setBillType("Tax Invoice")}
              >
                📄 Tax Invoice
              </button>
              <button
                type="button"
                className={`typeButton ${billType === "Proforma Invoice" ? "selected" : ""}`}
                onClick={() => setBillType("Proforma Invoice")}
              >
                📝 Proforma Invoice (PI)
              </button>
            </div>
          </div>

          {/* Bill Details Inputs */}
          <div className="formGrid" style={{ marginTop: "16px" }}>
            <label>
              Invoice / Bill Number *
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-01"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </label>

            <label>
              Supplier Name *
              <input
                type="text"
                required
                placeholder="e.g. Apex Supplies"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </label>

            <label>
              Invoice Date
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </label>

            <label>
              Amount (₹)
              <input type="number" min="0" placeholder="e.g. 50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>

          {/* File Input Dropzone */}
          <div className="dropzone" style={{ marginTop: "16px" }}>
            <div className="uploadIcon">⇪</div>
            <h2>Choose a PDF document to upload</h2>
            <p>Upload soft copies of invoices, challans or vouchers</p>
            <label className="primary" style={{ cursor: "pointer", marginTop: "8px" }}>
              Choose PDF File
              <input hidden type="file" accept=".pdf,application/pdf" onChange={handleFile} />
            </label>
            <small>Supports: PDF format only</small>
          </div>

          {/* Selected File Card */}
          {file && (
            <div className="fileRow" style={{ marginTop: "14px" }}>
              <span>📄</span>
              <div>
                <b>{file.name}</b>
                <small>{(file.size / 1024).toFixed(1)} KB • PDF Document</small>
              </div>
              <button
                type="button"
                className="remove"
                onClick={() => {
                  setFile(null);
                  setFileData("");
                }}
              >
                Remove
              </button>
            </div>
          )}

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary">✓ Upload {billType}</button>
          </div>
        </form>
      </section>

      {/* Uploaded Bills Table */}
      <section className="card tableCard" style={{ marginTop: "20px" }}>
        <div className="sectionHead">
          <h2>Uploaded Bills Vault ({bills.length})</h2>
          {bills.length > 0 && (
            <button type="button" className="secondary" onClick={handleExport}>
              ⤓ Export to Excel
            </button>
          )}
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Bill #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Amount</th>
                <th>File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="emptyTable">
                    <p>No bills uploaded yet. Fill the form above to upload one.</p>
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id}>
                    <td><Badge>{b.billType}</Badge></td>
                    <td><strong>{b.billNumber}</strong></td>
                    <td>{b.supplierName}</td>
                    <td>{b.billDate}</td>
                    <td>{b.amount}</td>
                    <td>
                      <a href={b.fileData} download={b.fileName} className="fileDownloadLink">
                        📎 {b.fileName}
                      </a>
                    </td>
                    <td>
                      <button type="button" className="danger" onClick={() => handleDelete(b.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
