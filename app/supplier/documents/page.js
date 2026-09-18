"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStorageData, STORAGE_KEYS } from "@/lib/dataService";
import "../supplier.css";

export default function SupplierDocumentsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const clientBills = getStorageData(STORAGE_KEYS.BILLS, []);
        const res = await fetch("/api/supplier/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bills: clientBills }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setBills(json.data.bills || []);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDocuments();
  }, [user]);

  return (
    <Shell>
      <div className="sectionHeaderRow" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
            Supplier Invoices & Vault
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Official copies of submitted Tax Invoices, Proforma Invoices, and Delivery Challans.
          </p>
        </div>
      </div>

      <div className="supplierTableWrapper">
        {bills.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧾</div>
            <b style={{ color: "var(--text-primary)", fontSize: "15px" }}>
              No Attached Documents Found
            </b>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>
              Invoices and delivery bills submitted for your supplier account will appear here.
            </p>
          </div>
        ) : (
          <table className="supplierTable">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Invoice / Bill #</th>
                <th>Date</th>
                <th>Total Value</th>
                <th>File Attached</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, idx) => (
                <tr key={b.id || idx}>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        background: "#eef2ff",
                        color: "#4338ca",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      {b.billType || "Invoice"}
                    </span>
                  </td>
                  <td>
                    <b>{b.billNumber}</b>
                  </td>
                  <td>{b.billDate || "—"}</td>
                  <td>
                    <b>{b.amount || "—"}</b>
                  </td>
                  <td>{b.fileName || "document.pdf"}</td>
                  <td>{b.fileSize || "—"}</td>
                  <td>
                    {b.fileData ? (
                      <a
                        href={b.fileData}
                        download={b.fileName || "invoice.pdf"}
                        className="btn btn-sm btn-secondary"
                        style={{ textDecoration: "none" }}
                      >
                        ⤓ Download
                      </a>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
