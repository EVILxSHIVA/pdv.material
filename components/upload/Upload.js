"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { exportToExcel } from "@/lib/exportToExcel";
import "@/components/ui/ui.css";
import "./upload.css";

/**
 * Enterprise Upload Center for Soft Copies (PDFs/Images)
 * Context-aware for both Supplier and Administrator roles.
 */
export default function Upload() {
  const { user } = useAuth();
  const isSupplier = user?.role === "SUPPLIER";
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

  // Admin filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [registeredSuppliers, setRegisteredSuppliers] = useState([]);

  // 2. Load stored bills and suppliers on page load
  useEffect(() => {
    try {
      localStorage.removeItem("materialflow_real_bills");
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setBills(Array.isArray(saved) ? saved : []);

      // Load registered suppliers for Admin dropdown
      const rawSuppliers = localStorage.getItem("pdv_app_suppliers");
      if (rawSuppliers) {
        const parsed = JSON.parse(rawSuppliers);
        if (Array.isArray(parsed)) {
          const names = parsed.map((s) => (Array.isArray(s) ? s[1] : s.name)).filter(Boolean);
          setRegisteredSuppliers(names);
        }
      } else {
        setRegisteredSuppliers([
          "Vasu Enterprises",
          "Apex Supplies",
          "Shree Balaji Fittings",
          "National Tools & Hardware",
          "Krishna Pipe Solutions"
        ]);
      }
    } catch (e) {
      console.warn("Could not read bills:", e);
      setBills([]);
    }
  }, []);

  // Pre-fill supplier name if logged in as supplier
  useEffect(() => {
    if (isSupplier) {
      setSupplierName(user?.supplierName || "Vasu Enterprises");
    }
  }, [isSupplier, user]);

  // Save bills list to state and localStorage
  const saveBills = (newList) => {
    setBills(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
  };

  // 3. File select helper (Strictly validates PDF format and converts to base64)
  const handleFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

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
    const activeSupplier = isSupplier
      ? (user?.supplierName || "Vasu Enterprises")
      : (supplierName || "Direct Vendor");

    const newBill = {
      id: Date.now(),
      billType,
      billNumber: billNumber || `${billType === "Tax Invoice" ? "INV" : "PI"}-${Date.now().toString().slice(-4)}`,
      supplierName: activeSupplier,
      supplierCode: isSupplier ? (user?.supplierCode || "SUP-001") : "",
      billDate: billDate || today,
      amount: amount ? `₹ ${Number(amount).toLocaleString()}` : "—",
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileData,
      uploadedBy: isSupplier ? "Supplier" : "Admin",
      createdAt: new Date().toISOString(),
    };

    saveBills([newBill, ...bills]);
    setMessage(
      isSupplier
        ? `✓ Your ${billType} "${newBill.billNumber}" has been uploaded and submitted to PDV Operations!`
        : `✓ ${billType} "${newBill.billNumber}" saved to Document Vault!`
    );

    // Reset inputs
    setBillNumber("");
    if (!isSupplier) setSupplierName("");
    setBillDate("");
    setAmount("");
    setFile(null);
    setFileData("");
    setTimeout(() => setMessage(""), 4000);
  };

  // 5. Delete bill
  const handleDelete = (id) => {
    if (confirm("Delete this uploaded bill record?")) {
      saveBills(bills.filter((b) => b.id !== id));
    }
  };

  // 6. Scoped and filtered bills list
  const scopedBills = useMemo(() => {
    let list = bills;

    // If logged in as supplier, isolate strictly to their bills
    if (isSupplier) {
      const myName = (user?.supplierName || "Vasu Enterprises").toLowerCase();
      const myCode = (user?.supplierCode || "SUP-001").toLowerCase();
      list = list.filter(
        (b) =>
          (b.supplierName && b.supplierName.toLowerCase() === myName) ||
          (b.supplierCode && b.supplierCode.toLowerCase() === myCode) ||
          (b.uploadedBy === "Supplier")
      );
    } else {
      // Admin filters
      if (filterSupplier !== "All") {
        list = list.filter((b) => b.supplierName === filterSupplier);
      }
      if (filterType !== "All") {
        list = list.filter((b) => b.billType === filterType);
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        list = list.filter(
          (b) =>
            (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
            (b.supplierName && b.supplierName.toLowerCase().includes(q)) ||
            (b.fileName && b.fileName.toLowerCase().includes(q))
        );
      }
    }

    return list;
  }, [bills, isSupplier, user, filterSupplier, filterType, searchTerm]);

  // 7. Export bills to Excel
  const handleExport = () => {
    const headers = ["Type", "Number", "Supplier", "Date", "Amount", "File Name", "Size", "Uploaded By"];
    const rows = scopedBills.map((b) => [
      b.billType,
      b.billNumber,
      b.supplierName,
      b.billDate,
      b.amount,
      b.fileName,
      b.fileSize,
      b.uploadedBy || "Admin",
    ]);
    exportToExcel({
      filename: isSupplier ? "My_Supplier_Invoices" : "Document_Vault_Bills",
      headers,
      rows,
    });
  };

  if (isSupplier) {
    return (
      <Shell>
        <div style={{ padding: "48px 24px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "16px" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏢</div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>Supplier Workspace</h2>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "13.5px" }}>
            Bill uploads are managed directly by PDV Procurement.
          </p>
          <div style={{ marginTop: "16px" }}>
            <Link href="/supplier" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Title
        title="Upload Bills & Documents Vault"
        desc="Central document repository for supplier tax invoices, proforma bills, and payment receipts."
      />

      {message && <div className="billSuccessBanner">{message}</div>}

      {/* Role Context Notification Bar */}
      {isSupplier ? (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏢</span>
            <div>
              <b style={{ color: "#1e40af", fontSize: "13.5px" }}>
                Supplier Account: {user?.supplierName || "Vasu Enterprises"} ({user?.supplierCode || "SUP-001"})
              </b>
              <p style={{ color: "#3b82f6", fontSize: "12px", margin: "2px 0 0" }}>
                All documents submitted here will be automatically assigned to your vendor ledger and available to Admin.
              </p>
            </div>
          </div>
          <Link
            href="/supplier/documents"
            className="btn btn-sm btn-secondary"
            style={{ textDecoration: "none", whiteSpace: "nowrap" }}
          >
            Go to Documents Portal ➔
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <div>
              <b style={{ color: "#0f172a", fontSize: "13.5px" }}>Administrator Document Console</b>
              <p style={{ color: "#64748b", fontSize: "12px", margin: "2px 0 0" }}>
                Upload bills on behalf of any supplier or inspect all supplier-submitted attachments.
              </p>
            </div>
          </div>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#475467" }}>
            Total Vault Documents: <strong>{bills.length}</strong>
          </span>
        </div>
      )}

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
              <button
                type="button"
                className={`typeButton ${billType === "Delivery Challan" ? "selected" : ""}`}
                onClick={() => setBillType("Delivery Challan")}
              >
                🚚 Delivery Challan
              </button>
            </div>
          </div>

          {/* Bill Details Inputs */}
          <div className="formGrid" style={{ marginTop: "16px" }}>
            <label>
              Invoice / Document Number *
              <input
                type="text"
                required
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </label>

            <label>
              Supplier *
              {isSupplier ? (
                <div
                  style={{
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "7px",
                    fontWeight: "600",
                    color: "#334155",
                    fontSize: "13px",
                  }}
                >
                  🏢 {user?.supplierName || "Vasu Enterprises"} (Locked)
                </div>
              ) : (
                <input
                  type="text"
                  required
                  list="registered-suppliers-list"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              )}
              {!isSupplier && (
                <datalist id="registered-suppliers-list">
                  {registeredSuppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
            </label>

            <label>
              Document / Invoice Date
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>

            <label>
              Total Billed Amount (₹)
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>

          {/* File Input Dropzone */}
          <div className="dropzone" style={{ marginTop: "16px" }}>
            <div className="uploadIcon">⇪</div>
            <h2>Choose a PDF document to upload</h2>
            <p>Upload official soft copy of {billType}</p>
            <label className="primary" style={{ cursor: "pointer", marginTop: "8px" }}>
              Choose PDF File
              <input
                hidden
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
              />
            </label>
            <small>Format: Strict PDF document only</small>
          </div>

          {/* Selected File Card */}
          {file && (
            <div className="fileRow" style={{ marginTop: "14px" }}>
              <span>📄</span>
              <div>
                <b>{file.name}</b>
                <small>
                  {(file.size / 1024).toFixed(1)} KB • PDF Attached
                </small>
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

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button type="submit" className="primary">
              ✓ Submit {billType}
            </button>
          </div>
        </form>
      </section>

      {/* Uploaded Bills Table / Vault */}
      <section className="card tableCard" style={{ marginTop: "24px" }}>
        <div className="sectionHead">
          <div>
            <h2>
              {isSupplier ? "My Submitted Documents" : "Uploaded Documents Vault"} ({scopedBills.length})
            </h2>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "2px 0 0" }}>
              {isSupplier
                ? "Official archives of documents submitted under your vendor account"
                : "Master archive of all bills and invoices with instant PDF access"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {scopedBills.length > 0 && (
              <button
                type="button"
                className="secondary"
                onClick={handleExport}
                title="Download Excel archive"
              >
                ⤓ Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* Admin Filters Bar */}
        {!isSupplier && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "0 22px 14px",
              flexWrap: "wrap",
              alignItems: "center",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <input
              type="text"
              placeholder="Search by bill #, supplier, or file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                height: "36px",
                border: "1px solid #d9dfe9",
                borderRadius: "7px",
                padding: "0 10px",
                fontSize: "13px",
                flex: "1 1 220px",
              }}
            />

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Supplier:</span>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                style={{
                  height: "36px",
                  border: "1px solid #d9dfe9",
                  borderRadius: "7px",
                  padding: "0 10px",
                  fontSize: "12.5px",
                }}
              >
                <option value="All">All Suppliers</option>
                {registeredSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  height: "36px",
                  border: "1px solid #d9dfe9",
                  borderRadius: "7px",
                  padding: "0 10px",
                  fontSize: "12.5px",
                }}
              >
                <option value="All">All Types</option>
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Proforma Invoice">Proforma Invoice</option>
                <option value="Delivery Challan">Delivery Challan</option>
              </select>
            </div>
          </div>
        )}

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Bill / Doc #</th>
                <th>Supplier</th>
                <th>Invoice Date</th>
                <th>Amount</th>
                <th>Attached PDF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scopedBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="emptyTable">
                    <p>
                      {isSupplier
                        ? "You have not submitted any documents yet. Use the upload box above."
                        : "No matching documents found in the vault."}
                    </p>
                  </td>
                </tr>
              ) : (
                scopedBills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Badge>{b.billType || "Invoice"}</Badge>
                    </td>
                    <td>
                      <strong>{b.billNumber}</strong>
                    </td>
                    <td>{b.supplierName}</td>
                    <td>{b.billDate || "—"}</td>
                    <td>
                      <b>{b.amount}</b>
                    </td>
                    <td>
                      {b.fileData ? (
                        <a
                          href={b.fileData}
                          download={b.fileName || "document.pdf"}
                          className="fileDownloadLink"
                        >
                          📎 {b.fileName || "document.pdf"} ({b.fileSize || "PDF"})
                        </a>
                      ) : (
                        <span>📎 {b.fileName || "document.pdf"}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {b.fileData && (
                          <a
                            href={b.fileData}
                            download={b.fileName || "document.pdf"}
                            className="btn btn-sm btn-secondary"
                            style={{ textDecoration: "none", fontSize: "11px", padding: "4px 8px" }}
                          >
                            ⤓ Download
                          </a>
                        )}
                        {!isSupplier && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDelete(b.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "12px", fontWeight: "600" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
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
