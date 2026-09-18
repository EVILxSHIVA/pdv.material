"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import DetailDrawer from "@/components/ui/DetailDrawer";
import { exportToExcel } from "@/lib/exportToExcel";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/dataService";
import { useAuth } from "@/lib/auth/AuthContext";
import "@/components/ui/ui.css";

export default function PurchasesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role !== "SUPPLIER";

  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deliveryFilter, setDeliveryFilter] = useState("All");
  const [selectedPo, setSelectedPo] = useState(null);

  useEffect(() => {
    setPurchases(getStorageData(STORAGE_KEYS.PURCHASES, []));
  }, []);

  const savePurchases = (newList) => {
    setPurchases(newList);
    setStorageData(STORAGE_KEYS.PURCHASES, newList);
  };

  const handleDeliveryStatusChange = (po, newStatus) => {
    if (!isAdmin) return;
    const pNum = po.piNumber || (Array.isArray(po) ? po[0] : "");
    const updated = purchases.map((p) => {
      const curNum = p.piNumber || (Array.isArray(p) ? p[0] : "");
      if (p === po || (curNum && curNum === pNum)) {
        if (Array.isArray(p)) {
          const copy = [...p];
          copy[7] = newStatus;
          return copy;
        }
        return { ...p, deliveryStatus: newStatus };
      }
      return p;
    });
    savePurchases(updated);

    if (selectedPo) {
      if (Array.isArray(selectedPo)) {
        const copy = [...selectedPo];
        copy[7] = newStatus;
        setSelectedPo(copy);
      } else {
        setSelectedPo((prev) => (prev ? { ...prev, deliveryStatus: newStatus } : null));
      }
    }
  };

  const handleApproveOrder = (po) => {
    const updated = purchases.map((p) => {
      const pNum = p.piNumber || (Array.isArray(p) ? p[0] : "");
      const targetNum = po.piNumber || (Array.isArray(po) ? po[0] : "");
      if (p === po || pNum === targetNum) {
        if (Array.isArray(p)) {
          const copy = [...p];
          copy[6] = "Approved";
          return copy;
        }
        return { ...p, status: "Approved" };
      }
      return p;
    });
    savePurchases(updated);
    if (Array.isArray(po)) {
      const copy = [...po];
      copy[6] = "Approved";
      setSelectedPo(copy);
    } else {
      setSelectedPo({ ...po, status: "Approved" });
    }
  };

  const handleDelete = (index) => {
    if (confirm("Delete this purchase record?")) {
      savePurchases(purchases.filter((_, i) => i !== index));
      setSelectedPo(null);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const no = p.piNumber || (Array.isArray(p) ? p[0] : "");
    const sup = p.supplier || (Array.isArray(p) ? p[2] : "");
    const stat = p.status || (Array.isArray(p) ? p[6] : "");
    const deliv = p.deliveryStatus || (Array.isArray(p) ? p[7] : "Pending") || "Pending";

    const matchesSearch =
      !search ||
      String(no).toLowerCase().includes(search.toLowerCase()) ||
      String(sup).toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || String(stat).toLowerCase() === statusFilter.toLowerCase();
    const matchesDelivery = deliveryFilter === "All" || String(deliv).toLowerCase() === deliveryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDelivery;
  });

  const handleExport = () => {
    const headers = [
      "PI Number",
      "Date",
      "Supplier",
      "Quote #",
      "Items Count",
      "Total Amount",
      "Settlement Status",
      "Delivery Status",
    ];
    const rows = filteredPurchases.map((p) => {
      if (Array.isArray(p)) {
        return [
          p[0],
          p[1],
          p[2],
          p[3],
          p[4],
          p[5],
          p[6],
          p[7] || "Pending",
        ];
      }
      return [
        p.piNumber,
        p.piDate,
        p.supplier,
        p.quotationNumber,
        p.itemsCount,
        p.totalAmount,
        p.status,
        p.deliveryStatus || "Pending",
      ];
    });
    exportToExcel({ filename: "Purchases_PI_Report", headers, rows });
  };

  return (
    <Shell>
      <Title
        title="Purchases / PI Master"
        desc="Track inward purchase orders, supplier bills, line items, and payment settlements."
        action={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="secondary" onClick={handleExport}>
              ⤓ Export to Excel
            </button>
            <Link href="/purchases/new" className="primary">
              + New Purchase
            </Link>
          </div>
        }
      />

      {/* Purchases Table Card */}
      <section className="card tableCard">
        <div className="tableControls">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}>
            <div className="invSearchBox" style={{ maxWidth: "260px" }}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search PI#, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="invSelect"
            >
              <option value="All">All Settlements</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="invSelect"
            >
              <option value="All">All Deliveries</option>
              <option value="Pending">Delivery: Pending</option>
              <option value="Shipped">Delivery: Shipped</option>
              <option value="Delivered">Delivery: Delivered</option>
            </select>
          </div>

          <span className="tableCountHint">
            Showing <strong>{filteredPurchases.length}</strong> of <strong>{purchases.length}</strong> purchases
          </span>
        </div>

        {/* Mobile-first compact cards (hidden on desktop) */}
        <div className="mobileCardList">
          {filteredPurchases.length === 0 ? (
            <div className="emptyTable">
              <p>No purchase records found.</p>
              <Link
                href="/purchases/new"
                className="primary"
                style={{ display: "inline-block", marginTop: "8px" }}
              >
                + Create Purchase Order
              </Link>
            </div>
          ) : (
            filteredPurchases.map((p, idx) => {
              const no = p.piNumber || (Array.isArray(p) ? p[0] : `PO-${idx + 1}`);
              const date = p.piDate || (Array.isArray(p) ? p[1] : "—");
              const sup = p.supplier || (Array.isArray(p) ? p[2] : "Direct Supplier");
              const quote = p.quotationNumber || (Array.isArray(p) ? p[3] : "—");
              const count = p.itemsCount || (Array.isArray(p) ? p[4] : (p.lineItems ? p.lineItems.length : 1));
              const amt = p.totalAmount || (Array.isArray(p) ? p[5] : "—");
              const stat = p.status || (Array.isArray(p) ? p[6] : "Approved");
              const deliv = p.deliveryStatus || (Array.isArray(p) ? p[7] : "Pending") || "Pending";

              return (
                <div
                  key={idx}
                  className="mobileDataCard"
                  onClick={() => setSelectedPo(p)}
                >
                  <div className="mobileCardHeader">
                    <div className="mobileCardTitleArea">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <code className="codeBadge">{no}</code>
                        {p.origin === "Supplier Portal" && (
                          <span style={{ fontSize: "10px", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                            Supplier Portal
                          </span>
                        )}
                      </div>
                      <h3 className="mobileCardTitle">{sup}</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                      <Badge>{stat}</Badge>
                      <Badge>{deliv}</Badge>
                    </div>
                  </div>

                  <div className="mobileCardBody">
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Total Billed</span>
                      <strong className="mobileMetricVal highlight">{amt}</strong>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Purchase Date</span>
                      <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{date}</span>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Line Items</span>
                      <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}><b>{count}</b> materials</span>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Delivery</span>
                      <span className="mobileMetricVal" style={{ fontSize: "13px" }}>
                        <Badge>{deliv}</Badge>
                      </span>
                    </div>
                  </div>

                  <div className="mobileCardFooter">
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Quote: {quote}
                    </span>
                    <button
                      type="button"
                      className="mobilePrimaryAction"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPo(p);
                      }}
                    >
                      Inspect →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>PI / Voucher #</th>
                <th>Purchase Date</th>
                <th>Supplier</th>
                <th>Quotation Ref</th>
                <th>Line Items</th>
                <th>Total Value (₹)</th>
                <th>Settlement</th>
                <th>Delivery Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="emptyTable">
                    <p>No purchase records found.</p>
                    <Link
                      href="/purchases/new"
                      className="primary"
                      style={{ display: "inline-block", marginTop: "8px" }}
                    >
                      + Create Purchase Order
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, idx) => {
                  const no = p.piNumber || (Array.isArray(p) ? p[0] : `PO-${idx + 1}`);
                  const date = p.piDate || (Array.isArray(p) ? p[1] : "—");
                  const sup = p.supplier || (Array.isArray(p) ? p[2] : "Direct Vendor");
                  const quote = p.quotationNumber || (Array.isArray(p) ? p[3] : "—");
                  const count = p.itemsCount || (Array.isArray(p) ? p[4] : (p.lineItems ? p.lineItems.length : 1));
                  const amt = p.totalAmount || (Array.isArray(p) ? p[5] : "—");
                  const stat = p.status || (Array.isArray(p) ? p[6] : "Approved");
                  const deliv = p.deliveryStatus || (Array.isArray(p) ? p[7] : "Pending") || "Pending";

                  return (
                    <tr key={idx} onClick={() => setSelectedPo(p)}>
                      <td>
                        <strong>{no}</strong>
                        {p.origin === "Supplier Portal" && (
                          <span style={{ fontSize: "10px", marginLeft: "6px", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                            Supplier
                          </span>
                        )}
                      </td>
                      <td>{date}</td>
                      <td>{sup}</td>
                      <td>{quote}</td>
                      <td>
                        <b>{count}</b> materials
                      </td>
                      <td>
                        <strong style={{ color: "var(--brand-700)" }}>{amt}</strong>
                      </td>
                      <td>
                        <Badge>{stat}</Badge>
                      </td>
                      <td>
                        <Badge>{deliv}</Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="actionBtn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPo(p);
                          }}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Purchase Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedPo)}
        onClose={() => setSelectedPo(null)}
        title={selectedPo?.piNumber || (Array.isArray(selectedPo) ? selectedPo[0] : "Purchase Details")}
        subtitle={`Supplier: ${selectedPo?.supplier || (Array.isArray(selectedPo) ? selectedPo[2] : "—")}`}
        badge={<Badge>{selectedPo?.status || (Array.isArray(selectedPo) ? selectedPo[6] : "Approved")}</Badge>}
        footerActions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(selectedPo?.status === "Pending" || (Array.isArray(selectedPo) && selectedPo[6] === "Pending")) && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleApproveOrder(selectedPo)}
              >
                ✓ Approve Order
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                const idx = purchases.indexOf(selectedPo);
                if (idx >= 0) handleDelete(idx);
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="secondary btn-sm"
              onClick={() => setSelectedPo(null)}
            >
              Close
            </button>
          </div>
        }
      >
        {selectedPo && (() => {
          const currentDelivStatus =
            selectedPo.deliveryStatus ||
            (Array.isArray(selectedPo) ? selectedPo[7] : "Pending") ||
            "Pending";

          return (
            <div>
              {selectedPo.origin === "Supplier Portal" && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px" }}>
                  <b style={{ color: "#065f46", fontSize: "12.5px" }}>📦 Supplier Initiated Order</b>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#047857" }}>
                    Submitted directly by {selectedPo.supplier || (Array.isArray(selectedPo) ? selectedPo[2] : "")} through the Supplier Portal.
                  </p>
                </div>
              )}

              {/* Fulfillment & Delivery Stepper Control */}
              <div
                style={{
                  background: "var(--surface-alt, #f8fafc)",
                  border: "1px solid var(--border-default, #e2e8f0)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Fulfillment & Delivery
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                      <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        Delivery Stage:
                      </strong>
                      <Badge>{currentDelivStatus}</Badge>
                    </div>
                  </div>

                  {isAdmin ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                        Set Status:
                      </label>
                      <select
                        className="invSelect"
                        style={{ padding: "4px 10px", height: "34px", fontSize: "13px", fontWeight: "600" }}
                        value={currentDelivStatus}
                        onChange={(e) => handleDeliveryStatusChange(selectedPo, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                {/* Stepper Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {[
                    { id: "Pending", label: "Pending", icon: "⏳" },
                    { id: "Shipped", label: "Shipped", icon: "🚚" },
                    { id: "Delivered", label: "Delivered", icon: "✓" },
                  ].map((stage, sIdx) => {
                    const stages = ["Pending", "Shipped", "Delivered"];
                    const curIdx = stages.indexOf(currentDelivStatus);
                    const isPassedOrCurrent = curIdx >= sIdx;
                    const isCurrent = curIdx === sIdx;

                    return (
                      <button
                        key={stage.id}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => isAdmin && handleDeliveryStatusChange(selectedPo, stage.id)}
                        title={isAdmin ? `Set delivery status to ${stage.label}` : "Admin access required to modify"}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: isCurrent
                            ? stage.id === "Delivered"
                              ? "2px solid #059669"
                              : stage.id === "Shipped"
                              ? "2px solid #2563eb"
                              : "2px solid #d97706"
                            : isPassedOrCurrent
                            ? "1px solid #cbd5e1"
                            : "1px dashed #cbd5e1",
                          background: isCurrent
                            ? stage.id === "Delivered"
                              ? "#ecfdf5"
                              : stage.id === "Shipped"
                              ? "#eff6ff"
                              : "#fffbeb"
                            : isPassedOrCurrent
                            ? "#f1f5f9"
                            : "transparent",
                          color: isCurrent
                            ? stage.id === "Delivered"
                              ? "#065f46"
                              : stage.id === "Shipped"
                              ? "#1e40af"
                              : "#92400e"
                            : isPassedOrCurrent
                            ? "#334155"
                            : "var(--text-muted)",
                          fontWeight: isCurrent ? "700" : "500",
                          fontSize: "12px",
                          cursor: isAdmin ? "pointer" : "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{stage.icon}</span>
                        <span>{stage.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="drawerMetricGrid">
                <div className="drawerMetricCard">
                  <span className="drawerMetricLabel">Total Billed</span>
                  <strong className="drawerMetricVal">
                    {selectedPo.totalAmount || (Array.isArray(selectedPo) ? selectedPo[5] : "—")}
                  </strong>
                </div>
                <div className="drawerMetricCard">
                  <span className="drawerMetricLabel">Purchase Date</span>
                  <strong className="drawerMetricVal" style={{ fontSize: "14px" }}>
                    {selectedPo.piDate || (Array.isArray(selectedPo) ? selectedPo[1] : "—")}
                  </strong>
                </div>
                <div className="drawerMetricCard">
                  <span className="drawerMetricLabel">Quote Ref</span>
                  <strong className="drawerMetricVal" style={{ fontSize: "14px" }}>
                    {selectedPo.quotationNumber || (Array.isArray(selectedPo) ? selectedPo[3] : "—")}
                  </strong>
                </div>
              </div>

              {selectedPo.lineItems && selectedPo.lineItems.length > 0 && (
                <div>
                  <h4 className="drawerSectionTitle">Purchased Line Items ({selectedPo.lineItems.length})</h4>
                  <div className="tableScroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPo.lineItems.map((item, i) => (
                          <tr key={i}>
                            <td><strong>{item.materialName}</strong></td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>₹ {item.rate}</td>
                            <td>₹ {item.total?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h4 className="drawerSectionTitle" style={{ marginTop: "20px" }}>
                Procurement Info
              </h4>
              <div className="drawerKvList">
                <div className="drawerKvRow">
                  <span className="drawerKvLabel">Destination Warehouse:</span>
                  <span className="drawerKvVal">{selectedPo.location || "Central Warehouse"}</span>
                </div>
                <div className="drawerKvRow">
                  <span className="drawerKvLabel">Settlement Status:</span>
                  <span className="drawerKvVal">{selectedPo.status || (Array.isArray(selectedPo) ? selectedPo[6] : "Approved")}</span>
                </div>
                <div className="drawerKvRow">
                  <span className="drawerKvLabel">Delivery Status:</span>
                  <span className="drawerKvVal"><Badge>{currentDelivStatus}</Badge></span>
                </div>
                <div className="drawerKvRow">
                  <span className="drawerKvLabel">Remarks:</span>
                  <span className="drawerKvVal">{selectedPo.remarks || "No remarks"}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>
    </Shell>
  );
}
