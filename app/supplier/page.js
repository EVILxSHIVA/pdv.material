"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStorageData, STORAGE_KEYS } from "@/lib/dataService";
import {
  syncSupplierGoogleSheet,
  getSupplierSheetUrl,
  saveSupplierSheetUrl,
} from "@/google_sheets_sync/syncClient";
import "./supplier.css";

export default function SupplierDashboardPage() {
  const { user } = useAuth();

  const [supplierData, setSupplierData] = useState({
    profile: null,
    purchases: [],
    bills: [],
    products: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [sheetInput, setSheetInput] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState({ type: "", text: "" });

  // Load server-isolated data for this authenticated supplier
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const clientPurchases = getStorageData(STORAGE_KEYS.PURCHASES, []);
        const clientBills = getStorageData(STORAGE_KEYS.BILLS, []);
        const clientProducts = getStorageData(STORAGE_KEYS.PRODUCTS, []);

        const res = await fetch("/api/supplier/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchases: clientPurchases,
            bills: clientBills,
            products: clientProducts,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setSupplierData({
              profile: json.supplier,
              purchases: json.data.purchases || [],
              bills: json.data.bills || [],
              products: json.data.products || [],
            });
          }
        }
      } catch (err) {
        console.error("[Supplier Portal] Error loading scoped data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    const code = user?.supplierCode || "SUP-001";
    const existingSheet = getSupplierSheetUrl(code);
    setSheetUrl(existingSheet);
    setSheetInput(existingSheet);
  }, [user]);

  const { purchases, bills, profile } = supplierData;

  // Calculate Metrics strictly for this supplier
  const totalOrders = purchases.length;
  const pendingOrders = purchases.filter((p) => {
    const stat = (p.status || (Array.isArray(p) ? p[6] : "")).toLowerCase();
    return stat !== "completed" && stat !== "paid";
  }).length;
  const completedOrders = totalOrders - pendingOrders;

  // Parse numerical total billed from this vendor
  const totalBilledValue = purchases.reduce((acc, p) => {
    const rawAmt = p.totalAmount || (Array.isArray(p) ? p[5] : "0");
    const num = Number(String(rawAmt).replace(/[^0-9.-]+/g, "")) || 0;
    return acc + num;
  }, 0);

  const companyName = profile?.companyName || user?.supplierName || "Supplier Workspace";
  const supplierCode = profile?.code || user?.supplierCode || "SUP-001";

  const handleSaveSheet = (e) => {
    e.preventDefault();
    saveSupplierSheetUrl(supplierCode, sheetInput);
    setSheetUrl(sheetInput);
    setIsEditingSheet(false);
    setSyncFeedback({ type: "success", text: "Supplier Google Sheet connection saved." });
  };

  const handleSyncMySheet = async () => {
    if (!sheetUrl) {
      setIsEditingSheet(true);
      return;
    }

    setSyncLoading(true);
    setSyncFeedback({ type: "info", text: "Synchronizing your purchase orders and invoices..." });
    try {
      const res = await syncSupplierGoogleSheet(supplierCode, companyName);
      setSyncFeedback({
        type: "success",
        text: `✓ Google Sheet Synced! ${res.totalReceived} records processed (${res.totalAdded} added, ${res.totalUpdated} updated) with zero duplicates.`,
      });
    } catch (err) {
      setSyncFeedback({
        type: "error",
        text: `Sync error: ${err.message}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <Shell>
      {/* 1. Clean Top Header Card */}
      <div className="supplierBanner">
        <div className="supplierBannerLeft">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1>{companyName}</h1>
            <span className="supplierMetaBadge">
              Code: {supplierCode} · {profile?.status || "Active"}
            </span>
          </div>
          <p>Supplier Portal · Track orders and material dispatches.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/supplier/orders?action=new" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span>+</span> Place Order
          </Link>
        </div>
      </div>

      {/* 2. Compact Google Sheet Sync Bar */}
      <div className="sheetSyncCard">
        <div className="sheetSyncLeft">
          <div className="sheetSyncTitleRow">
            <h3>Google Sheet Sync</h3>
            {sheetUrl ? (
              <span className="sheetStatusPill connected">● Connected</span>
            ) : (
              <span className="sheetStatusPill pending">○ Not Connected</span>
            )}
          </div>
          <p>Sync your purchase orders directly to your private Google Sheet.</p>
        </div>

        <div className="sheetSyncActions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setIsEditingSheet(!isEditingSheet)}
          >
            ⚙ {sheetUrl ? "Change Link" : "Connect Sheet"}
          </button>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
              style={{ textDecoration: "none" }}
            >
              ↗ Open Sheet
            </a>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={syncLoading || !sheetUrl}
            onClick={handleSyncMySheet}
          >
            {syncLoading ? "Syncing..." : "⚡ Sync Now"}
          </button>
        </div>
      </div>

      {isEditingSheet && (
        <form onSubmit={handleSaveSheet} className="sheetEditForm">
          <label style={{ flex: "1 1 280px", fontSize: "12px", fontWeight: "600" }}>
            Google Spreadsheet URL:
            <input
              type="url"
              required
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              style={{ width: "100%", marginTop: "4px", padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-sm btn-primary">Save</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setIsEditingSheet(false)}>Cancel</button>
        </form>
      )}

      {syncFeedback.text && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            marginBottom: "16px",
            background: syncFeedback.type === "success" ? "#ecfdf5" : syncFeedback.type === "error" ? "#fef2f2" : "#eff6ff",
            color: syncFeedback.type === "success" ? "#065f46" : syncFeedback.type === "error" ? "#991b1b" : "#1e40af",
            border: `1px solid ${syncFeedback.type === "success" ? "#a7f3d0" : syncFeedback.type === "error" ? "#fecaca" : "#bfdbfe"}`,
          }}
        >
          {syncFeedback.text}
        </div>
      )}

      {/* 3. Clean Metrics Grid */}
      <div className="supplierMetricsGrid">
        <div className="supplierMetricCard">
          <div className="supplierMetricHeader">
            <span className="supplierMetricLabel">Total Orders</span>
            <span className="supplierMetricIcon">📋</span>
          </div>
          <div className="supplierMetricValue">{totalOrders}</div>
          <span className="supplierMetricSubtext">All time orders</span>
        </div>

        <div className="supplierMetricCard">
          <div className="supplierMetricHeader">
            <span className="supplierMetricLabel">Pending</span>
            <span className="supplierMetricIcon">⏳</span>
          </div>
          <div className="supplierMetricValue" style={{ color: "#d97706" }}>
            {pendingOrders}
          </div>
          <span className="supplierMetricSubtext">To dispatch / deliver</span>
        </div>

        <div className="supplierMetricCard">
          <div className="supplierMetricHeader">
            <span className="supplierMetricLabel">Completed</span>
            <span className="supplierMetricIcon">✓</span>
          </div>
          <div className="supplierMetricValue" style={{ color: "#059669" }}>
            {completedOrders}
          </div>
          <span className="supplierMetricSubtext">Delivered & verified</span>
        </div>

        <div className="supplierMetricCard">
          <div className="supplierMetricHeader">
            <span className="supplierMetricLabel">Total Billed</span>
            <span className="supplierMetricIcon">₹</span>
          </div>
          <div className="supplierMetricValue" style={{ color: "#4f46e5" }}>
            ₹ {totalBilledValue.toLocaleString()}
          </div>
          <span className="supplierMetricSubtext">Total billed value</span>
        </div>
      </div>

      {/* 4. Recent Orders Table */}
      <div className="sectionHeaderRow" style={{ marginTop: "8px", marginBottom: "14px" }}>
        <h2 className="sectionTitle">Recent Orders</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/supplier/orders" className="btn btn-sm btn-secondary" style={{ textDecoration: "none" }}>
            View All ({totalOrders}) ➔
          </Link>
        </div>
      </div>

      <div className="supplierTableWrapper">
        {purchases.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>📦</div>
            <b style={{ color: "var(--text-primary)" }}>No Orders Yet</b>
            <p style={{ fontSize: "13px", marginTop: "2px" }}>
              Click "+ Place Order" above to submit a new supply order.
            </p>
          </div>
        ) : (
          <table className="supplierTable">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Date</th>
                <th>Quote Ref</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Destination</th>
                <th>Payment</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {purchases.slice(0, 5).map((p, idx) => {
                const no = p.piNumber || (Array.isArray(p) ? p[0] : `PO-${idx + 1}`);
                const dt = p.piDate || (Array.isArray(p) ? p[1] : "—");
                const quote = p.quotationNumber || (Array.isArray(p) ? p[3] : "—");
                const itemsCount = p.itemsCount || (p.lineItems ? p.lineItems.length : 1);
                const amt = p.totalAmount || (Array.isArray(p) ? p[5] : "—");
                const loc = p.location || "Central Warehouse";
                const stat = p.status || (Array.isArray(p) ? p[6] : "Approved");
                const deliv = p.deliveryStatus || (Array.isArray(p) ? p[7] : "Pending") || "Pending";

                return (
                  <tr key={no || idx}>
                    <td>
                      <b style={{ color: "var(--brand-600)" }}>{no}</b>
                    </td>
                    <td>{dt}</td>
                    <td>{quote}</td>
                    <td>{itemsCount} {itemsCount === 1 ? "item" : "items"}</td>
                    <td>
                      <b>{amt}</b>
                    </td>
                    <td>{loc}</td>
                    <td>
                      <Badge
                        status={
                          stat.toLowerCase() === "paid" || stat.toLowerCase() === "completed"
                            ? "Completed"
                            : stat.toLowerCase() === "partial"
                            ? "Pending"
                            : "Approved"
                        }
                      />
                    </td>
                    <td>
                      <Badge>{deliv}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Minimal Support Line */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12.5px", color: "#64748b" }}>
        Need support? Email Procurement at <code>procurement@pdv.com</code>
      </div>
    </Shell>
  );
}
