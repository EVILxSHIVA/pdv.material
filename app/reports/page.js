"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";
import { syncAllToGoogleSheets, getSheetUrl, getWebhookUrl, saveSheetConfig } from "@/google_sheets_sync/syncClient";
import "@/components/ui/ui.css";

export default function ReportsPage() {
  const [data, setData] = useState({
    suppliers: [],
    products: [],
    purchases: [],
    issues: [],
    consumptions: [],
    bills: [],
    needed: [],
    payments: [],
  });

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: "", message: "" });
  const [sheetUrl, setSheetUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [webhookInput, setWebhookInput] = useState("");

  // Load all data from localStorage
  useEffect(() => {
    const get = (k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn(e);
      }
      return [];
    };

    setData({
      suppliers: get("pdv_app_suppliers"),
      products: get("pdv_app_products"),
      purchases: get("pdv_app_purchases"),
      issues: get("pdv_app_issue"),
      consumptions: get("pdv_app_consumption"),
      bills: get("pdv_app_bills"),
      needed: get("pdv_app_material_needed"),
      payments: get("pdv_app_party_payments"),
    });

    setSheetUrl(getSheetUrl());
    setWebhookInput(getWebhookUrl());
  }, []);

  // Sync to Google Sheets
  const handleSyncAll = async () => {
    setSyncLoading(true);
    setSyncStatus({ type: "info", message: "Syncing all 8 modules to Google Sheets..." });
    try {
      const res = await syncAllToGoogleSheets({ mode: "replace" });
      setSyncStatus({
        type: "success",
        message: `✓ Successfully synced all modules to Google Sheets! (${res.syncedSheets?.length || 8} tabs updated)`,
      });
      setSheetUrl(getSheetUrl());
    } catch (err) {
      setSyncStatus({
        type: "error",
        message: `Sync failed: ${err.message}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    saveSheetConfig({ webhookUrl: webhookInput });
    setIsConfigOpen(false);
    setSyncStatus({ type: "success", message: "Webhook URL configuration saved." });
  };

  // Reusable download helper
  const handleDownload = (filename, headers, rows) => {
    exportToExcel({ filename, headers, rows });
  };

  const reports = [
    {
      title: "Invoices & Bills Vault",
      desc: "Soft copies of Tax Invoices & Proforma Invoices.",
      count: data.bills.length,
      icon: "🧾",
      onDownload: () => handleDownload("Bills_Report", ["Type", "Number", "Supplier", "Date", "Amount", "File"], data.bills.map((b) => [b.billType, b.billNumber, b.supplierName, b.billDate, b.amount, b.fileName])),
    },
    {
      title: "Suppliers Directory",
      desc: "All active and inactive suppliers with contact details.",
      count: data.suppliers.length,
      icon: "🏢",
      onDownload: () => handleDownload("Suppliers_Directory", ["Code", "Name", "Contact", "Phone", "Email", "GST", "Status"], data.suppliers),
    },
    {
      title: "Products Catalog",
      desc: "Complete product master, categories, and rates.",
      count: data.products.length,
      icon: "📦",
      onDownload: () => handleDownload("Products_Catalog", ["Code", "Name", "Category", "Unit", "Desc", "Supplier", "Rate", "Status"], data.products),
    },
    {
      title: "Purchase Orders",
      desc: "Purchase orders, vendors, and total billing amounts.",
      count: data.purchases.length,
      icon: "📑",
      onDownload: () => handleDownload("Purchases_Report", ["PI Number", "Date", "Supplier", "Quote #", "Items", "Amount", "Status"], data.purchases),
    },
    {
      title: "Material Issues",
      desc: "Dispatched materials to sites and departments.",
      count: data.issues.length,
      icon: "↗",
      onDownload: () => handleDownload("Material_Issues", ["Number", "Date", "Department", "Items", "Status"], data.issues.map((i) => [i.number, i.date, i.department, i.itemsCount, i.status])),
    },
    {
      title: "Material Consumption",
      desc: "Usage history and remaining balances.",
      count: data.consumptions.length,
      icon: "◔",
      onDownload: () => handleDownload("Material_Consumption", ["Number", "Date", "Department", "Items", "Status"], data.consumptions.map((c) => [c.number, c.date, c.department, c.itemsCount, c.status])),
    },
    {
      title: "Material Needed & Requisitions",
      desc: "Active site requirements, demand, and priorities.",
      count: data.needed.length,
      icon: "📋",
      onDownload: () => handleDownload("Material_Needed_Report", ["Party / Site", "Material Required", "Qty Needed", "Unit", "Required Date", "Priority", "Status", "Remarks"], data.needed.map((n) => [n.partyName, n.materialName, n.quantityNeeded, n.unit, n.requiredByDate, n.priority, n.status, n.remarks])),
    },
    {
      title: "Party Payment Ledger",
      desc: "Invoiced values, amount paid/received, and balance due.",
      count: data.payments.length,
      icon: "💰",
      onDownload: () => handleDownload("Party_Payment_Ledger", ["Party", "Invoice #", "Date", "Total Billed", "Amount Paid", "Balance Left", "Payment Mode", "Status"], data.payments.map((p) => [p.partyName, p.invoiceNo, p.invoiceDate, p.totalAmount, p.amountPaid, p.balanceLeft, p.paymentMode, p.status])),
    },
  ];

  return (
    <Shell>
      <Title title="Reports & Cloud Sync" desc="Synchronize to official Google Sheets or download Excel spreadsheets." />

      {/* Google Sheets Sync Card */}
      <section className="card" style={{ padding: "18px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>Google Sheets Cloud Sync</h2>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px" }}>
                Connected
              </span>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
              Official Spreadsheet: <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: "4px" }}>14oJVSNd3xuRloR9DZR_7zfnjvMVrwWh6nltjvqap_h0</code>
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
              ⚙ Webhook Settings
            </button>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              ↗ Open Google Sheet
            </a>
            <button
              type="button"
              className="primary"
              disabled={syncLoading}
              onClick={handleSyncAll}
            >
              {syncLoading ? "Syncing..." : "⚡ Sync All to Google Sheets"}
            </button>
          </div>
        </div>

        {/* Config drawer */}
        {isConfigOpen && (
          <form onSubmit={handleSaveConfig} style={{ marginTop: "16px", padding: "12px", background: "var(--panel-alt)", borderRadius: "var(--radius-sm)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", flex: "1 1 300px" }}>
              Google Apps Script Webhook URL:
              <input
                type="url"
                required
                style={{ width: "100%", height: "34px", marginTop: "4px", padding: "0 8px", borderRadius: "4px", border: "1px solid var(--border)" }}
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
              />
            </label>
            <button type="submit" className="primary" style={{ height: "34px", alignSelf: "flex-end" }}>Save</button>
          </form>
        )}

        {/* Live sync alert */}
        {syncStatus.message && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: "600",
              background: syncStatus.type === "success" ? "var(--green-bg)" : syncStatus.type === "error" ? "var(--red-bg)" : "var(--blue-bg)",
              color: syncStatus.type === "success" ? "var(--green-text)" : syncStatus.type === "error" ? "var(--red-text)" : "var(--blue-text)",
              border: "1px solid currentColor",
            }}
          >
            {syncStatus.message}
          </div>
        )}
      </section>

      {/* Reports Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {reports.map((r) => (
          <div key={r.title} className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{ fontSize: "22px" }}>{r.icon}</span>
                <div>
                  <h3 style={{ fontSize: "14px", margin: 0 }}>{r.title}</h3>
                  <small style={{ color: "var(--muted)" }}>{r.count} records</small>
                </div>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0 }}>{r.desc}</p>
            </div>
            <button type="button" className={r.count > 0 ? "primary" : "secondary"} onClick={r.onDownload}>
              ⤓ Download Excel (.csv)
            </button>
          </div>
        ))}
      </div>

      {/* Bills Vault Table */}
      <section className="card tableCard" style={{ marginTop: "24px" }}>
        <div className="sectionHead">
          <h2>Uploaded Bills Register ({data.bills.length})</h2>
        </div>
        <div className="tableScroll">
          <table>
            <thead>
              <tr><th>Type</th><th>Bill #</th><th>Supplier</th><th>Date</th><th>Amount</th><th>File</th></tr>
            </thead>
            <tbody>
              {data.bills.length === 0 ? (
                <tr><td colSpan={6} className="emptyTable"><p>No bills uploaded yet.</p></td></tr>
              ) : (
                data.bills.map((b) => (
                  <tr key={b.id}>
                    <td><Badge>{b.billType}</Badge></td>
                    <td><strong>{b.billNumber}</strong></td>
                    <td>{b.supplierName}</td>
                    <td>{b.billDate}</td>
                    <td>{b.amount}</td>
                    <td>
                      <a href={b.fileData} download={b.fileName} style={{ color: "#4f46e5", fontWeight: "600" }}>
                        📎 {b.fileName}
                      </a>
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
