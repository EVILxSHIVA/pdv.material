"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import DetailDrawer from "@/components/ui/DetailDrawer";
import {
  getStorageData,
  setStorageData,
  STORAGE_KEYS,
  calculateLiveInventory,
} from "@/lib/dataService";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "@/components/ui/ui.css";

const STATUS_TABS = ["All", "Pending", "Approved", "Issued", "Rejected"];

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [liveInventory, setLiveInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Request Form
  const [newReq, setNewReq] = useState({
    partyName: "Jaipur Site",
    materialName: "",
    quantityNeeded: 25,
    unit: "Nos",
    priority: "Normal",
    requiredByDate: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  useEffect(() => {
    const raw = getStorageData(STORAGE_KEYS.NEEDED, []);
    // Provide initial starter sample requests if empty for realistic operational demonstration
    if (raw.length === 0) {
      const initialSeed = [
        {
          id: "REQ-101",
          partyName: "SITE A (Jaipur Metro)",
          materialName: "Steel Tube Nipple 2.5\"x12\" GI Sleeve",
          quantityNeeded: 25,
          unit: "Nos",
          priority: "High",
          status: "Pending Approval",
          createdAt: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          requiredByDate: new Date().toISOString().split("T")[0],
          remarks: "Urgent line fitting replacement for pipeline sector 4",
        },
        {
          id: "REQ-102",
          partyName: "SITE B (Ajmer Expressway)",
          materialName: "Isolation Ball Valve 1/2\" BSP",
          quantityNeeded: 10,
          unit: "Pcs",
          priority: "Urgent",
          status: "Pending Approval",
          createdAt: "Today · 10:42 AM",
          requiredByDate: new Date().toISOString().split("T")[0],
          remarks: "Required for main shut-off assembly",
        },
        {
          id: "REQ-103",
          partyName: "Vrindavan Site A",
          materialName: "MDPE Pipe 32mm SDR 11",
          quantityNeeded: 150,
          unit: "Mtr",
          priority: "Normal",
          status: "Approved",
          createdAt: "Yesterday · 04:15 PM",
          requiredByDate: new Date().toISOString().split("T")[0],
          remarks: "Approved by Rajesh (Ops). Ready for warehouse dispatch.",
        },
        {
          id: "REQ-104",
          partyName: "Delhi Distribution Center",
          materialName: "Pressure Gauge 0-10 Bar Bottom Mount",
          quantityNeeded: 6,
          unit: "Nos",
          priority: "Normal",
          status: "Issued",
          createdAt: "12 Sep · 11:00 AM",
          requiredByDate: "2026-09-12",
          remarks: "Dispatched under Challan MI-8421",
        },
      ];
      setStorageData(STORAGE_KEYS.NEEDED, initialSeed, false);
      setRequests(initialSeed);
    } else {
      setRequests(raw);
    }

    setLiveInventory(calculateLiveInventory());
  }, []);

  useEffect(() => {
    if (isNewModalOpen) {
      lockScroll();
    }
    return () => {
      if (isNewModalOpen) unlockScroll();
    };
  }, [isNewModalOpen]);

  const saveRequestsList = (list) => {
    setRequests(list);
    setStorageData(STORAGE_KEYS.NEEDED, list);
  };

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!newReq.materialName || !newReq.partyName) return;

    const newItem = {
      ...newReq,
      id: `REQ-${Date.now().toString().slice(-4)}`,
      quantityNeeded: Number(newReq.quantityNeeded) || 1,
      status: "Pending Approval",
      createdAt: "Today · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [newItem, ...requests];
    saveRequestsList(updated);
    setIsNewModalOpen(false);
    setNewReq({
      partyName: "Jaipur Site",
      materialName: "",
      quantityNeeded: 25,
      unit: "Nos",
      priority: "Normal",
      requiredByDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
  };

  const handleUpdateStatus = (reqItem, newStatus) => {
    const updated = requests.map((r) => {
      if (r === reqItem || (r.id && r.id === reqItem.id)) {
        return { ...r, status: newStatus };
      }
      return r;
    });
    saveRequestsList(updated);
    if (selectedRequest) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const mat = String(r.materialName || "").toLowerCase();
      const party = String(r.partyName || "").toLowerCase();
      const s = search.toLowerCase();
      const matchesSearch = !search || mat.includes(s) || party.includes(s);

      const status = String(r.status || "Pending Approval").toLowerCase();
      const matchesTab =
        activeTab === "All"
          ? true
          : activeTab === "Pending"
            ? status.includes("pending") || status.includes("requested")
            : activeTab === "Approved"
              ? status.includes("approved")
              : activeTab === "Issued"
                ? status.includes("issued") || status.includes("completed")
                : activeTab === "Rejected"
                  ? status.includes("rejected")
                  : true;

      return matchesSearch && matchesTab;
    });
  }, [requests, search, activeTab]);

  // Find matching warehouse inventory stock for selected item
  const selectedProductStock = useMemo(() => {
    if (!selectedRequest?.materialName) return null;
    const sName = selectedRequest.materialName.toLowerCase();
    return liveInventory.find((i) => i.name.toLowerCase().includes(sName) || sName.includes(i.name.toLowerCase()));
  }, [selectedRequest, liveInventory]);

  return (
    <Shell>
      <Title
        title="Material Requests"
        desc="Field site requisitions, supervisor approval workflows, and warehouse dispatch allocation."
        action={
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setIsNewModalOpen(true)}
            >
              + Create Site Request
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <section className="card tableCard">
        <div className="tableControls" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
            <div className="invSearchBox">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search site, material or requisition code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="clearBtn" onClick={() => setSearch("")}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`actionBtn ${activeTab === tab ? "view" : ""}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: activeTab === tab ? 700 : 500,
                  background: activeTab === tab ? "var(--primary-forest)" : "transparent",
                  color: activeTab === tab ? "#ffffff" : "var(--text-secondary)",
                  borderColor: activeTab === tab ? "var(--forest-deep)" : "var(--border-default)",
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Mobile-First Operational Requisition Cards (Section 13) */}
        <div className="mobileCardList">
          {filteredRequests.length === 0 ? (
            <div className="emptyTable">
              <p>No material requests found for the selected filter.</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setSearch("");
                  setActiveTab("All");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredRequests.map((req, idx) => {
              const status = req.status || "Pending Approval";
              return (
                <div
                  key={req.id || idx}
                  className="mobileDataCard"
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="mobileCardHeader">
                    <div className="mobileCardTitleArea">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                        <code className="codeBadge">{req.id || `REQ-${idx + 1}`}</code>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-forest)" }}>
                          {req.partyName}
                        </span>
                      </div>
                      <h3 className="mobileCardTitle">{req.materialName}</h3>
                    </div>
                    <Badge>{status}</Badge>
                  </div>

                  <div className="mobileCardBody">
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Quantity Needed</span>
                      <strong className="mobileMetricVal highlight">
                        {req.quantityNeeded} {req.unit || "Nos"}
                      </strong>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Priority</span>
                      <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>
                        <Badge variant={req.priority === "Urgent" ? "danger" : "warning"}>
                          {req.priority || "Normal"}
                        </Badge>
                      </span>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Requested On</span>
                      <span className="mobileMetricVal" style={{ fontSize: "12.5px" }}>
                        {req.createdAt || req.requiredByDate || "Today"}
                      </span>
                    </div>
                  </div>

                  <div className="mobileCardFooter">
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {req.remarks ? `"${req.remarks.slice(0, 32)}..."` : "Field requisition"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ minHeight: "40px", padding: "0 18px", fontSize: "13px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(req);
                      }}
                    >
                      Review →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Data Table (Visible on > 768px) */}
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Requisition #</th>
                <th>Destination Site</th>
                <th>Material Requested</th>
                <th>Quantity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="emptyTable">
                    <p>No material requests found.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => (
                  <tr key={req.id || idx} onClick={() => setSelectedRequest(req)}>
                    <td>
                      <code className="codeBadge">{req.id || `REQ-${idx + 1}`}</code>
                    </td>
                    <td>
                      <strong>{req.partyName}</strong>
                    </td>
                    <td>{req.materialName}</td>
                    <td>
                      <b>{req.quantityNeeded}</b> {req.unit || "Nos"}
                    </td>
                    <td>
                      <Badge variant={req.priority === "Urgent" ? "danger" : "warning"}>
                        {req.priority || "Normal"}
                      </Badge>
                    </td>
                    <td>
                      <Badge>{req.status || "Pending Approval"}</Badge>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {req.createdAt || req.requiredByDate || "Today"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="actionBtn view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Review Drawer / Bottom Sheet */}
      <DetailDrawer
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest ? `Review Request ${selectedRequest.id || ""}` : ""}
        subtitle={selectedRequest?.partyName}
        footerActions={
          <div style={{ display: "flex", gap: "8px", width: "100%", flexWrap: "wrap" }}>
            {selectedRequest?.status !== "Approved" && selectedRequest?.status !== "Issued" && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, minHeight: "44px" }}
                onClick={() => handleUpdateStatus(selectedRequest, "Approved")}
              >
                ✓ Approve Request
              </button>
            )}

            {selectedRequest?.status === "Approved" && (
              <Link
                href={`/material-issue?party=${encodeURIComponent(selectedRequest.partyName)}&material=${encodeURIComponent(selectedRequest.materialName)}&qty=${selectedRequest.quantityNeeded}`}
                className="btn btn-primary"
                style={{ flex: 1, minHeight: "44px" }}
              >
                ↗ Proceed to Issue
              </Link>
            )}

            {selectedRequest?.status !== "Rejected" && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ minHeight: "44px", padding: "0 14px" }}
                onClick={() => handleUpdateStatus(selectedRequest, "Rejected")}
              >
                Reject
              </button>
            )}
          </div>
        }
      >
        {selectedRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Requested Material
              </span>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                {selectedRequest.materialName}
              </h3>
              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                <div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Required Quantity</span>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary-forest)" }}>
                    {selectedRequest.quantityNeeded} {selectedRequest.unit || "Nos"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Current Status</span>
                  <div style={{ marginTop: "2px" }}>
                    <Badge>{selectedRequest.status || "Pending Approval"}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Stock Comparison */}
            <div
              style={{
                background: selectedProductStock && selectedProductStock.availableStock >= selectedRequest.quantityNeeded ? "var(--green-bg)" : "var(--amber-bg)",
                border: "1px solid",
                borderColor: selectedProductStock && selectedProductStock.availableStock >= selectedRequest.quantityNeeded ? "var(--green-border)" : "var(--amber-border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Warehouse Live Stock Check
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div>
                  <strong>{selectedProductStock ? `${selectedProductStock.availableStock} ${selectedProductStock.unit}` : "Item not indexed"}</strong>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {selectedProductStock ? `Physical available in ${selectedProductStock.location}` : "Standard order needed"}
                  </p>
                </div>
                <Badge variant={selectedProductStock && selectedProductStock.availableStock >= selectedRequest.quantityNeeded ? "success" : "warning"}>
                  {selectedProductStock && selectedProductStock.availableStock >= selectedRequest.quantityNeeded ? "Stock Available" : "Stock Shortage"}
                </Badge>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
              <div><strong>Site Location:</strong> {selectedRequest.partyName}</div>
              <div><strong>Urgency:</strong> {selectedRequest.priority || "Normal"}</div>
              <div><strong>Required By Date:</strong> {selectedRequest.requiredByDate || "Immediate"}</div>
              {selectedRequest.remarks && (
                <div><strong>Supervisor Notes:</strong> {selectedRequest.remarks}</div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* New Request Modal */}
      {isNewModalOpen && (
        <div className="modalBackdrop" onClick={() => setIsNewModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Create Field Material Request</h3>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setIsNewModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modalBody">
                <div className="formGrid" style={{ gridTemplateColumns: "1fr" }}>
                  <label>
                    Site / Party Name *
                    <input
                      type="text"
                      required
                      value={newReq.partyName}
                      onChange={(e) => setNewReq({ ...newReq, partyName: e.target.value })}
                    />
                  </label>

                  <label>
                    Material Description *
                    <input
                      type="text"
                      required
                      value={newReq.materialName}
                      onChange={(e) => setNewReq({ ...newReq, materialName: e.target.value })}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label>
                      Quantity Needed *
                      <input
                        type="number"
                        min="1"
                        required
                        value={newReq.quantityNeeded}
                        onChange={(e) => setNewReq({ ...newReq, quantityNeeded: e.target.value })}
                      />
                    </label>
                    <label>
                      Unit of Measure
                      <input
                        type="text"
                        value={newReq.unit}
                        onChange={(e) => setNewReq({ ...newReq, unit: e.target.value })}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label>
                      Priority
                      <select
                        value={newReq.priority}
                        onChange={(e) => setNewReq({ ...newReq, priority: e.target.value })}
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent (Critical)</option>
                      </select>
                    </label>
                    <label>
                      Required By Date
                      <input
                        type="date"
                        value={newReq.requiredByDate}
                        onChange={(e) => setNewReq({ ...newReq, requiredByDate: e.target.value })}
                      />
                    </label>
                  </div>

                  <label>
                    Work Purpose / Notes
                    <input
                      type="text"
                      value={newReq.remarks}
                      onChange={(e) => setNewReq({ ...newReq, remarks: e.target.value })}
                      placeholder="e.g. Line repair, emergency fitting"
                    />
                  </label>
                </div>
              </div>
              <div className="modalFooter">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
