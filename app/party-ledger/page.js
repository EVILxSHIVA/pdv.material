"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";
import { syncSingleToGoogleSheets, getWebhookUrl } from "@/google_sheets_sync/syncClient";
import "@/components/ui/ui.css";
import "./ledger.css";

export default function PartyLedgerPage() {
  // 1. Data States
  const [suppliers, setSuppliers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [neededList, setNeededList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // 2. Selection & Tab States
  const [selectedParty, setSelectedParty] = useState("All Parties");
  const [activeTab, setActiveTab] = useState("needed"); // 'needed' | 'issued' | 'consumed' | 'payments'
  
  // 3. Modals State
  const [isNeededModalOpen, setIsNeededModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Form states for adding Material Needed
  const [newNeeded, setNewNeeded] = useState({
    partyName: "",
    materialName: "",
    quantityNeeded: "",
    unit: "Pcs",
    requiredByDate: "",
    priority: "High",
    remarks: "",
  });

  // Form states for adding/updating Payments
  const [newPayment, setNewPayment] = useState({
    partyName: "",
    invoiceNo: "",
    invoiceDate: "",
    totalAmount: "",
    amountPaid: "",
    paymentMode: "Bank Transfer (NEFT/RTGS)",
    paymentDate: "",
    status: "Pending",
  });

  // Load all local data on mount
  useEffect(() => {
    const getStored = (key, fallback = []) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    };

    const loadedSuppliers = getStored("pdv_app_suppliers", []);
    const loadedIssues = getStored("pdv_app_issue", []);
    const loadedConsumptions = getStored("pdv_app_consumption", []);
    
    // Load and filter out any legacy dummy sample records
    let loadedNeeded = getStored("pdv_app_material_needed", []);
    if (Array.isArray(loadedNeeded)) {
      loadedNeeded = loadedNeeded.filter(
        (n) => n && n.partyName !== "Apex Supplies" && n.partyName !== "Vrindavan Site A"
      );
      localStorage.setItem("pdv_app_material_needed", JSON.stringify(loadedNeeded));
    }

    let loadedPayments = getStored("pdv_app_party_payments", []);
    if (Array.isArray(loadedPayments)) {
      loadedPayments = loadedPayments.filter(
        (p) => p && p.partyName !== "Apex Supplies" && p.partyName !== "Vrindavan Site A"
      );
      localStorage.setItem("pdv_app_party_payments", JSON.stringify(loadedPayments));
    }

    setSuppliers(loadedSuppliers);
    setIssues(loadedIssues);
    setConsumptions(loadedConsumptions);
    setNeededList(loadedNeeded);
    setPaymentsList(loadedPayments);
  }, []);

  // Sync helpers to Google Sheets
  const syncNeededToSheets = async (list) => {
    if (!getWebhookUrl()) return;
    try {
      const rows = list.map((n) => [n.partyName, n.materialName, n.quantityNeeded, n.unit, n.requiredByDate, n.priority, n.status, n.remarks]);
      await syncSingleToGoogleSheets({
        sheetName: "Material_Needed",
        headers: ["Party / Site", "Material Required", "Qty Needed", "Unit", "Required Date", "Priority", "Status", "Remarks"],
        rows,
      });
    } catch (e) {
      console.warn("Could not sync needed list to sheets:", e);
    }
  };

  const syncPaymentsToSheets = async (list) => {
    if (!getWebhookUrl()) return;
    try {
      const rows = list.map((p) => [p.partyName, p.invoiceNo, p.invoiceDate, p.totalAmount, p.amountPaid, p.balanceLeft, p.paymentMode, p.paymentDate, p.status]);
      await syncSingleToGoogleSheets({
        sheetName: "Party_Payments",
        headers: ["Party / Vendor", "Invoice #", "Invoice Date", "Total Billed (₹)", "Amount Paid / Received (₹)", "Balance Due (₹)", "Payment Mode", "Payment Date", "Status"],
        rows,
      });
    } catch (e) {
      console.warn("Could not sync payments list to sheets:", e);
    }
  };

  // Sync entire active ledger to sheets
  const handleSyncCurrentTabToSheets = async () => {
    if (!getWebhookUrl()) {
      alert("Please configure your Google Sheets Webhook URL first on the Reports page.");
      return;
    }
    setIsSyncing(true);
    setSyncStatus("Syncing to Google Sheets...");
    try {
      await syncNeededToSheets(neededList);
      await syncPaymentsToSheets(paymentsList);
      setSyncStatus("✓ Material Needed & Payment Ledger synced to Google Sheets!");
    } catch (e) {
      setSyncStatus("Sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(""), 4000);
    }
  };

  // Extract unique parties (Suppliers, Sites from Issues, and Customers)
  const uniqueParties = Array.from(
    new Set([
      ...suppliers.map((s) => s[1] || s.name || s[0]),
      ...issues.map((i) => i.department),
      ...consumptions.map((c) => c.department),
      ...neededList.map((n) => n.partyName),
      ...paymentsList.map((p) => p.partyName),
    ])
  ).filter(Boolean);

  // Filter datasets by selected party
  const filteredNeeded = selectedParty === "All Parties"
    ? neededList
    : neededList.filter((n) => (n.partyName || "").toLowerCase().includes(selectedParty.toLowerCase()));

  const filteredIssues = selectedParty === "All Parties"
    ? issues
    : issues.filter((i) => (i.department || "").toLowerCase().includes(selectedParty.toLowerCase()));

  const filteredConsumptions = selectedParty === "All Parties"
    ? consumptions
    : consumptions.filter((c) => (c.department || "").toLowerCase().includes(selectedParty.toLowerCase()));

  const filteredPayments = selectedParty === "All Parties"
    ? paymentsList
    : paymentsList.filter((p) => (p.partyName || "").toLowerCase().includes(selectedParty.toLowerCase()));

  // Financial KPIs for Selected Party
  const totalBilled = filteredPayments.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const totalReceived = filteredPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
  const totalBalanceDue = totalBilled - totalReceived;

  // Save new material needed handler
  const handleSaveNeeded = (e) => {
    e.preventDefault();
    if (!newNeeded.partyName || !newNeeded.materialName || !newNeeded.quantityNeeded) {
      alert("Please fill in required fields.");
      return;
    }

    const itemToAdd = {
      id: Date.now(),
      partyName: newNeeded.partyName,
      materialName: newNeeded.materialName,
      quantityNeeded: newNeeded.quantityNeeded,
      unit: newNeeded.unit || "Pcs",
      requiredByDate: newNeeded.requiredByDate || new Date().toLocaleDateString("en-GB"),
      priority: newNeeded.priority || "High",
      status: "Requested",
      remarks: newNeeded.remarks || "",
    };

    const updated = [itemToAdd, ...neededList];
    setNeededList(updated);
    localStorage.setItem("pdv_app_material_needed", JSON.stringify(updated));
    syncNeededToSheets(updated);
    setIsNeededModalOpen(false);
    setNewNeeded({ partyName: "", materialName: "", quantityNeeded: "", unit: "Pcs", requiredByDate: "", priority: "High", remarks: "" });
  };

  // Save new payment record handler
  const handleSavePayment = (e) => {
    e.preventDefault();
    const billed = Number(newPayment.totalAmount) || 0;
    const paid = Number(newPayment.amountPaid) || 0;
    const balance = Math.max(0, billed - paid);
    const status = paid >= billed && billed > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";

    const record = {
      id: Date.now(),
      partyName: newPayment.partyName || selectedParty || "Vendor",
      invoiceNo: newPayment.invoiceNo || `INV-${Date.now().toString().slice(-4)}`,
      invoiceDate: newPayment.invoiceDate || new Date().toLocaleDateString("en-GB"),
      totalAmount: billed,
      amountPaid: paid,
      balanceLeft: balance,
      paymentMode: newPayment.paymentMode,
      paymentDate: newPayment.paymentDate || new Date().toLocaleDateString("en-GB"),
      status,
    };

    const updated = [record, ...paymentsList];
    setPaymentsList(updated);
    localStorage.setItem("pdv_app_party_payments", JSON.stringify(updated));
    syncPaymentsToSheets(updated);
    setIsPaymentModalOpen(false);
    setNewPayment({ partyName: "", invoiceNo: "", invoiceDate: "", totalAmount: "", amountPaid: "", paymentMode: "Bank Transfer", paymentDate: "", status: "Pending" });
  };

  // Delete handlers
  const handleDeleteNeeded = (id) => {
    if (confirm("Remove this requirement?")) {
      const updated = neededList.filter((n) => n.id !== id);
      setNeededList(updated);
      localStorage.setItem("pdv_app_material_needed", JSON.stringify(updated));
      syncNeededToSheets(updated);
    }
  };

  const handleDeletePayment = (id) => {
    if (confirm("Delete this payment entry?")) {
      const updated = paymentsList.filter((p) => p.id !== id);
      setPaymentsList(updated);
      localStorage.setItem("pdv_app_party_payments", JSON.stringify(updated));
      syncPaymentsToSheets(updated);
    }
  };

  // Export current tab to Excel
  const handleExportStatement = () => {
    const filename = `${selectedParty.replace(/\s+/g, "_")}_Statement`;
    if (activeTab === "needed") {
      exportToExcel({
        filename,
        headers: ["Party Name", "Material Needed", "Quantity", "Unit", "Required Date", "Priority", "Status"],
        rows: filteredNeeded.map((n) => [n.partyName, n.materialName, n.quantityNeeded, n.unit, n.requiredByDate, n.priority, n.status]),
      });
    } else if (activeTab === "issued") {
      exportToExcel({
        filename,
        headers: ["Challan #", "Date", "Department / Party", "Items Count", "Status"],
        rows: filteredIssues.map((i) => [i.number, i.date, i.department, i.itemsCount, i.status]),
      });
    } else if (activeTab === "consumed") {
      exportToExcel({
        filename,
        headers: ["Consumption #", "Date", "Department / Party", "Items Count", "Status"],
        rows: filteredConsumptions.map((c) => [c.number, c.date, c.department, c.itemsCount, c.status]),
      });
    } else {
      exportToExcel({
        filename,
        headers: ["Party Name", "Invoice #", "Invoice Date", "Total Billed (₹)", "Amount Received (₹)", "Balance Left (₹)", "Payment Mode", "Status"],
        rows: filteredPayments.map((p) => [p.partyName, p.invoiceNo, p.invoiceDate, p.totalAmount, p.amountPaid, p.balanceLeft, p.paymentMode, p.status]),
      });
    }
  };

  return (
    <Shell>
      <Title
        title="Party Ledger"
        action={
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              disabled={isSyncing}
              onClick={handleSyncCurrentTabToSheets}
            >
              {isSyncing ? "Syncing..." : "Sync to Cloud"}
            </button>
            <button type="button" className="secondary" onClick={handleExportStatement}>
              Export CSV
            </button>
            <button type="button" className="secondary" onClick={() => setIsNeededModalOpen(true)}>
              + Request Material
            </button>
            <button type="button" className="primary" onClick={() => setIsPaymentModalOpen(true)}>
              + Record Payment
            </button>
          </div>
        }
      />

      {syncStatus && (
        <div style={{ padding: "10px 16px", background: "var(--green-bg)", color: "var(--green-text)", borderRadius: "var(--radius-md)", marginBottom: "16px", fontWeight: "600", fontSize: "13px", border: "1px solid var(--green-border)" }}>
          {syncStatus}
        </div>
      )}

      {/* 1. Party Selector & Financial Summary Bar */}
      <section className="card ledgerHeadCard">
        <div className="partySelectorRow">
          <div className="partySelector">
            <label>Party / Site Filter</label>
            <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)}>
              <option value="All Parties">All Parties & Sites (Overview)</option>
              {uniqueParties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="kpiGroup">
            <div className="kpiBox">
              <span className="kpiLabel">Total Invoiced</span>
              <strong className="kpiVal">₹ {totalBilled.toLocaleString()}</strong>
            </div>
            <div className="kpiBox success">
              <span className="kpiLabel">Amount Received</span>
              <strong className="kpiVal">₹ {totalReceived.toLocaleString()}</strong>
            </div>
            <div className="kpiBox danger">
              <span className="kpiLabel">Balance Outstanding</span>
              <strong className="kpiVal">
                ₹ {totalBalanceDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4-Tab Navigation */}
      <div className="ledgerTabs">
        <button
          type="button"
          className={`ledgerTab ${activeTab === "needed" ? "active" : ""}`}
          onClick={() => setActiveTab("needed")}
        >
          Material Needed ({filteredNeeded.length})
        </button>
        <button
          type="button"
          className={`ledgerTab ${activeTab === "issued" ? "active" : ""}`}
          onClick={() => setActiveTab("issued")}
        >
          Material Issued ({filteredIssues.length})
        </button>
        <button
          type="button"
          className={`ledgerTab ${activeTab === "consumed" ? "active" : ""}`}
          onClick={() => setActiveTab("consumed")}
        >
          Material Consumed ({filteredConsumptions.length})
        </button>
        <button
          type="button"
          className={`ledgerTab ${activeTab === "payments" ? "active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          Payment Ledger ({filteredPayments.length})
        </button>
      </div>

      {/* 3. Tab Contents */}
      <section className="card tableCard">
        {/* Tab 1: Material Needed */}
        {activeTab === "needed" && (
          <>
            <div className="tableScroll desktopTableView">
              <table>
                <thead>
                  <tr>
                    <th>Party / Site</th>
                    <th>Material Required</th>
                    <th>Qty Needed</th>
                    <th>Required Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNeeded.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="emptyTable">
                        <p>No material requirements recorded for {selectedParty}.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredNeeded.map((n) => (
                      <tr key={n.id}>
                        <td><strong>{n.partyName}</strong></td>
                        <td>{n.materialName}</td>
                        <td><b>{n.quantityNeeded}</b> {n.unit}</td>
                        <td>{n.requiredByDate}</td>
                        <td>
                          <span className={`priorityBadge ${n.priority.toLowerCase()}`}>{n.priority}</span>
                        </td>
                        <td><Badge>{n.status}</Badge></td>
                        <td>
                          <button type="button" className="danger" onClick={() => handleDeleteNeeded(n.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileRecordsView">
              {filteredNeeded.length === 0 ? (
                <div className="emptyTable" style={{ padding: "28px 16px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>No material requirements recorded.</p>
                </div>
              ) : (
                filteredNeeded.map((n) => (
                  <div key={n.id} className="mobileCardRow">
                    <div className="mobileCardMain">
                      <span className="mobileCardTitle">{n.materialName}</span>
                      <span className="mobileCardSub">{n.partyName} · <b>{n.quantityNeeded} {n.unit}</b></span>
                      <span className="mobileCardDate">Due: {n.requiredByDate}</span>
                    </div>
                    <div className="mobileCardRight">
                      <span className={`priorityBadge ${n.priority.toLowerCase()}`}>{n.priority}</span>
                      <button type="button" className="danger" style={{ fontSize: "11px", padding: "2px 6px" }} onClick={() => handleDeleteNeeded(n.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab 2: Material Issued */}
        {activeTab === "issued" && (
          <>
            <div className="tableScroll desktopTableView">
              <table>
                <thead>
                  <tr>
                    <th>Challan / Sl #</th>
                    <th>Date</th>
                    <th>Issued To / Site</th>
                    <th>Items Dispatched</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="emptyTable">
                        <p>No material issue records found for {selectedParty}.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((i, idx) => (
                      <tr key={idx}>
                        <td><strong>{i.number}</strong></td>
                        <td>{i.date}</td>
                        <td>{i.department}</td>
                        <td>{i.itemsCount} items</td>
                        <td><Badge>{i.status || "Issued"}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileRecordsView">
              {filteredIssues.length === 0 ? (
                <div className="emptyTable" style={{ padding: "28px 16px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>No material issue records found.</p>
                </div>
              ) : (
                filteredIssues.map((i, idx) => (
                  <div key={idx} className="mobileCardRow">
                    <div className="mobileCardMain">
                      <span className="mobileCardTitle">{i.number}</span>
                      <span className="mobileCardSub">{i.department} · {i.itemsCount} items</span>
                      <span className="mobileCardDate">{i.date}</span>
                    </div>
                    <div className="mobileCardRight">
                      <Badge>{i.status || "Issued"}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab 3: Material Consumed */}
        {activeTab === "consumed" && (
          <>
            <div className="tableScroll desktopTableView">
              <table>
                <thead>
                  <tr>
                    <th>Consumption #</th>
                    <th>Date</th>
                    <th>Site / Department</th>
                    <th>Items Utilized</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsumptions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="emptyTable">
                        <p>No material consumption records found for {selectedParty}.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredConsumptions.map((c, idx) => (
                      <tr key={idx}>
                        <td><strong>{c.number}</strong></td>
                        <td>{c.date}</td>
                        <td>{c.department}</td>
                        <td>{c.itemsCount} items</td>
                        <td><Badge>{c.status || "Consumed"}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileRecordsView">
              {filteredConsumptions.length === 0 ? (
                <div className="emptyTable" style={{ padding: "28px 16px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>No consumption records found.</p>
                </div>
              ) : (
                filteredConsumptions.map((c, idx) => (
                  <div key={idx} className="mobileCardRow">
                    <div className="mobileCardMain">
                      <span className="mobileCardTitle">{c.number}</span>
                      <span className="mobileCardSub">{c.department} · {c.itemsCount} items</span>
                      <span className="mobileCardDate">{c.date}</span>
                    </div>
                    <div className="mobileCardRight">
                      <Badge>{c.status || "Consumed"}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab 4: Payment Status & Ledger */}
        {activeTab === "payments" && (
          <>
            <div className="tableScroll desktopTableView">
              <table>
                <thead>
                  <tr>
                    <th>Party / Vendor</th>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Total Billed</th>
                    <th>Amount Received / Paid</th>
                    <th>Balance Left</th>
                    <th>Payment Mode</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="emptyTable">
                        <p>No payment or billing entries recorded for {selectedParty}.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.partyName}</strong></td>
                        <td>{p.invoiceNo}</td>
                        <td>{p.invoiceDate}</td>
                        <td><b>₹ {Number(p.totalAmount).toLocaleString()}</b></td>
                        <td style={{ color: "#059669", fontWeight: "700" }}>₹ {Number(p.amountPaid).toLocaleString()}</td>
                        <td style={{ color: p.balanceLeft > 0 ? "#dc2626" : "#475569", fontWeight: "700" }}>
                          ₹ {Number(p.balanceLeft).toLocaleString()}
                        </td>
                        <td>{p.paymentMode}</td>
                        <td><Badge>{p.status}</Badge></td>
                        <td>
                          <button type="button" className="danger" onClick={() => handleDeletePayment(p.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileRecordsView">
              {filteredPayments.length === 0 ? (
                <div className="emptyTable" style={{ padding: "28px 16px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>No payment entries recorded.</p>
                </div>
              ) : (
                filteredPayments.map((p) => (
                  <div key={p.id} className="mobileCardRow">
                    <div className="mobileCardMain">
                      <span className="mobileCardTitle">{p.partyName}</span>
                      <span className="mobileCardSub">{p.invoiceNo} · Billed: ₹ {Number(p.totalAmount).toLocaleString()}</span>
                      <span className="mobileCardSub" style={{ color: "#059669" }}>Paid: ₹ {Number(p.amountPaid).toLocaleString()} · Due: ₹ {Number(p.balanceLeft).toLocaleString()}</span>
                    </div>
                    <div className="mobileCardRight">
                      <Badge>{p.status}</Badge>
                      <button type="button" className="danger" style={{ fontSize: "11px", padding: "2px 6px" }} onClick={() => handleDeletePayment(p.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {/* MODAL 1: Request Material (Material Needed) */}
      {isNeededModalOpen && (
        <div className="modalBackdrop" onClick={() => setIsNeededModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>Request Material</h3>
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => setIsNeededModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveNeeded}>
              <div className="modalBody gridBody">
                <div className="formField">
                  <label>Supplier / Customer / Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Supplies or Site Vrindavan"
                    value={newNeeded.partyName}
                    onChange={(e) => setNewNeeded({ ...newNeeded, partyName: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Material Specification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GI Pipe 1/2 inch or NG Kit"
                    value={newNeeded.materialName}
                    onChange={(e) => setNewNeeded({ ...newNeeded, materialName: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Quantity Needed *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={newNeeded.quantityNeeded}
                    onChange={(e) => setNewNeeded({ ...newNeeded, quantityNeeded: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Unit</label>
                  <input
                    type="text"
                    placeholder="Pcs, Mtr, Box, Kg"
                    value={newNeeded.unit}
                    onChange={(e) => setNewNeeded({ ...newNeeded, unit: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Required By Date</label>
                  <input
                    type="date"
                    value={newNeeded.requiredByDate}
                    onChange={(e) => setNewNeeded({ ...newNeeded, requiredByDate: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Priority</label>
                  <select
                    value={newNeeded.priority}
                    onChange={(e) => setNewNeeded({ ...newNeeded, priority: e.target.value })}
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="secondary" onClick={() => setIsNeededModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary">Save Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Payment */}
      {isPaymentModalOpen && (
        <div className="modalBackdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>Record Payment</h3>
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => setIsPaymentModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modalBody gridBody">
                <div className="formField">
                  <label>Party / Vendor / Customer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Supplies"
                    value={newPayment.partyName}
                    onChange={(e) => setNewPayment({ ...newPayment, partyName: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Invoice / Bill Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-101"
                    value={newPayment.invoiceNo}
                    onChange={(e) => setNewPayment({ ...newPayment, invoiceNo: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Total Invoiced / Bill Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 100000"
                    value={newPayment.totalAmount}
                    onChange={(e) => setNewPayment({ ...newPayment, totalAmount: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Amount Received / Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 60000"
                    value={newPayment.amountPaid}
                    onChange={(e) => setNewPayment({ ...newPayment, amountPaid: e.target.value })}
                  />
                </div>

                <div className="formField">
                  <label>Payment Mode</label>
                  <select
                    value={newPayment.paymentMode}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMode: e.target.value })}
                  >
                    <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="formField">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary" style={{ background: "#059669", borderColor: "#059669" }}>
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
