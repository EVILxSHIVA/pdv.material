"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";
import "@/components/ui/ui.css";

export default function ReportsPage() {
  const [data, setData] = useState({ suppliers: [], products: [], purchases: [], issues: [], consumptions: [], bills: [] });

  // Load all data from localStorage
  useEffect(() => {
    const get = (k) => JSON.parse(localStorage.getItem(k) || "[]");
    setData({
      suppliers: get("materialflow_real_suppliers"),
      products: get("materialflow_real_products"),
      purchases: get("materialflow_real_purchases"),
      issues: get("materialflow_real_issue"),
      consumptions: get("materialflow_real_consumption"),
      bills: get("materialflow_real_bills"),
    });
  }, []);

  // Single reusable download helper
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
  ];

  return (
    <Shell>
      <Title title="Reports & Excel Export Hub" desc="Download your operational data anytime as Excel spreadsheets." />

      {/* Reports Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginTop: "10px" }}>
        {reports.map((r) => (
          <div key={r.title} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "24px" }}>{r.icon}</span>
                <div>
                  <h3 style={{ fontSize: "15px", margin: 0 }}>{r.title}</h3>
                  <small style={{ color: "var(--muted)" }}>{r.count} records</small>
                </div>
              </div>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>{r.desc}</p>
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
