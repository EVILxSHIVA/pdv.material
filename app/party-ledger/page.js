"use client";

import { useState, useEffect, useMemo } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";
import { syncSingleToGoogleSheets, getWebhookUrl } from "@/google_sheets_sync/syncClient";
import {
  getStorageData,
  setStorageData,
  STORAGE_KEYS,
  formatCurrency,
  getTodayDate,
} from "@/lib/dataService";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "@/components/ui/ui.css";
import "./ledger.css";

const INITIAL_NEEDED = {
  partyName: "",
  materialName: "",
  quantityNeeded: "",
  unit: "Pcs",
  requiredByDate: "",
  priority: "High",
  remarks: "",
};

const INITIAL_PAYMENT = {
  partyName: "",
  invoiceNo: "",
  invoiceDate: "",
  totalAmount: "",
  amountPaid: "",
  paymentMode: "Bank Transfer (NEFT/RTGS)",
  paymentDate: "",
  status: "Pending",
};

export default function PartyLedgerPage() {
  // Data States
  const [suppliers, setSuppliers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [neededList, setNeededList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Selection & Tab States
  const [selectedParty, setSelectedParty] = useState("All Parties");
  const [activeTab, setActiveTab] = useState("needed"); // 'needed' | 'issued' | 'consumed' | 'payments'

  // Modal States
  const [isNeededModalOpen, setIsNeededModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newNeeded, setNewNeeded] = useState(INITIAL_NEEDED);
  const [newPayment, setNewPayment] = useState(INITIAL_PAYMENT);

  // Load datasets on mount
  useEffect(() => {
    setSuppliers(getStorageData(STORAGE_KEYS.SUPPLIERS, []));
    setIssues(getStorageData(STORAGE_KEYS.ISSUES, []));
    setConsumptions(getStorageData(STORAGE_KEYS.CONSUMPTIONS, []));

    // Filter legacy sample placeholders if any
    const rawNeeded = getStorageData(STORAGE_KEYS.NEEDED, []);
    const cleanNeeded = rawNeeded.filter(
      (n) => n && n.partyName !== "Apex Supplies" && n.partyName !== "Vrindavan Site A"
    );
    setNeededList(cleanNeeded);
    if (cleanNeeded.length !== rawNeeded.length) {
      setStorageData(STORAGE_KEYS.NEEDED, cleanNeeded, false);
    }

    const rawPayments = getStorageData(STORAGE_KEYS.PAYMENTS, []);
    const cleanPayments = rawPayments.filter(
      (p) => p && p.partyName !== "Apex Supplies" && p.partyName !== "Vrindavan Site A"
    );
    setPaymentsList(cleanPayments);
    if (cleanPayments.length !== rawPayments.length) {
      setStorageData(STORAGE_KEYS.PAYMENTS, cleanPayments, false);
    }
  }, []);

  useEffect(() => {
    if (isNeededModalOpen) {
      lockScroll();
    }
    return () => {
      if (isNeededModalOpen) unlockScroll();
    };
  }, [isNeededModalOpen]);

  useEffect(() => {
    if (isPaymentModalOpen) {
      lockScroll();
    }
    return () => {
      if (isPaymentModalOpen) unlockScroll();
    };
  }, [isPaymentModalOpen]);

  // Sync to Google Sheets
  const syncNeededToSheets = async (list) => {
    if (!getWebhookUrl()) return;
    try {
      const rows = list.map((n) => [
        n.partyName,
        n.materialName,
        n.quantityNeeded,
        n.unit,
        n.requiredByDate,
        n.priority,
        n.status,
        n.remarks,
      ]);
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
      const rows = list.map((p) => [
        p.partyName,
        p.invoiceNo,
        p.invoiceDate,
        p.totalAmount,
        p.amountPaid,
        p.balanceLeft,
        p.paymentMode,
        p.paymentDate,
        p.status,
      ]);
      await syncSingleToGoogleSheets({
        sheetName: "Party_Payments",
        headers: ["Party / Vendor", "Invoice #", "Invoice Date", "Total Billed (₹)", "Amount Paid / Received (₹)", "Balance Due (₹)", "Payment Mode", "Payment Date", "Status"],
        rows,
      });
    } catch (e) {
      console.warn("Could not sync payments list to sheets:", e);
    }
  };

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

  // Extract unique parties
  const uniqueParties = useMemo(() => {
    return Array.from(
      new Set([
        ...suppliers.map((s) => (Array.isArray(s) ? s[1] || s[0] : s.name || s.code)),
        ...issues.map((i) => i.department || i.issuedTo),
        ...consumptions.map((c) => c.department || c.site),
        ...neededList.map((n) => n.partyName),
        ...paymentsList.map((p) => p.partyName),
      ])
    ).filter(Boolean);
  }, [suppliers, issues, consumptions, neededList, paymentsList]);

  // Filter datasets by selected party
  const filteredNeeded = useMemo(() => {
    return selectedParty === "All Parties"
      ? neededList
      : neededList.filter((n) => (n.partyName || "").toLowerCase().includes(selectedParty.toLowerCase()));
  }, [neededList, selectedParty]);

  const filteredIssues = useMemo(() => {
    return selectedParty === "All Parties"
      ? issues
      : issues.filter((i) => (i.department || i.issuedTo || "").toLowerCase().includes(selectedParty.toLowerCase()));
  }, [issues, selectedParty]);

  const filteredConsumptions = useMemo(() => {
    return selectedParty === "All Parties"
      ? consumptions
      : consumptions.filter((c) => (c.department || c.site || "").toLowerCase().includes(selectedParty.toLowerCase()));
  }, [consumptions, selectedParty]);

  const filteredPayments = useMemo(() => {
    return selectedParty === "All Parties"
      ? paymentsList
      : paymentsList.filter((p) => (p.partyName || "").toLowerCase().includes(selectedParty.toLowerCase()));
  }, [paymentsList, selectedParty]);

  // Financial KPIs
  const totalBilled = useMemo(() => filteredPayments.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0), [filteredPayments]);
  const totalReceived = useMemo(() => filteredPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0), [filteredPayments]);
  const totalBalanceDue = Math.max(0, totalBilled - totalReceived);

  // Save new material needed
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
    setStorageData(STORAGE_KEYS.NEEDED, updated);
    syncNeededToSheets(updated);
    setIsNeededModalOpen(false);
    setNewNeeded(INITIAL_NEEDED);
  };

  // Save new payment record
  const handleSavePayment = (e) => {
    e.preventDefault();
    const billed = Number(newPayment.totalAmount) || 0;
    const paid = Number(newPayment.amountPaid) || 0;
    const balance = Math.max(0, billed - paid);
    const status = paid >= billed && billed > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";

    const record = {
      id: Date.now(),
      partyName: newPayment.partyName || (selectedParty !== "All Parties" ? selectedParty : "Vendor"),
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
    setStorageData(STORAGE_KEYS.PAYMENTS, updated);
    syncPaymentsToSheets(updated);
    setIsPaymentModalOpen(false);
    setNewPayment(INITIAL_PAYMENT);
  };

  // Deletion handlers
  const handleDeleteNeeded = (id) => {
    if (confirm("Remove this requirement?")) {
      const updated = neededList.filter((n) => n.id !== id);
      setNeededList(updated);
      setStorageData(STORAGE_KEYS.NEEDED, updated);
      syncNeededToSheets(updated);
    }
  };

  const handleDeletePayment = (id) => {
    if (confirm("Delete this payment entry?")) {
      const updated = paymentsList.filter((p) => p.id !== id);
      setPaymentsList(updated);
      setStorageData(STORAGE_KEYS.PAYMENTS, updated);
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
        rows: filteredIssues.map((i) => [i.number || i.challanNo, i.date, i.department || i.issuedTo, i.itemsCount, i.status]),
      });
    } else if (activeTab === "consumed") {
      exportToExcel({
        filename,
        headers: ["Consumption #", "Date", "Department / Party", "Items Count", "Status"],
        rows: filteredConsumptions.map((c) => [c.number, c.date, c.department || c.site, c.itemsCount, c.status]),
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
              <strong className="kpiVal">{formatCurrency(totalBilled)}</strong>
            </div>
            <div className="kpiBox success">
              <span className="kpiLabel">Amount Received</span>
              <strong className="kpiVal">{formatCurrency(totalReceived)}</strong>
            </div>
            <div className="kpiBox danger">
              <span className="kpiLabel">Balance Outstanding</span>
              <strong className="kpiVal">{formatCurrency(totalBalanceDue)}</strong>
            </div>
          </div>
        </div>

        {/* Material Summary Position */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-default)" }}>
          <div className="kpiBox">
            <span className="kpiLabel">Material Requested</span>
            <strong className="kpiVal">{filteredNeeded.reduce((a, n) => a + (Number(n.quantityNeeded) || 1), 0)} Units</strong>
          </div>
          <div className="kpiBox">
            <span className="kpiLabel">Material Issued</span>
            <strong className="kpiVal">{filteredIssues.reduce((a, i) => a + (Number(i.itemsCount) || 1), 0)} Items</strong>
          </div>
          <div className="kpiBox">
            <span className="kpiLabel">Material Consumed</span>
            <strong className="kpiVal">{filteredConsumptions.reduce((a, c) => a + (Number(c.itemsCount) || 1), 0)} Items</strong>
          </div>
          <div className="kpiBox" style={{ background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
            <span className="kpiLabel">Active Requisitions</span>
            <strong className="kpiVal" style={{ color: "var(--brand-700)" }}>{filteredNeeded.length} Pending</strong>
          </div>
        </div>
      </section>

      {/* 2. 4-Tab Navigation */}
      <div className="ledgerTabs">
        {[
          { id: "needed", label: `Material Needed (${filteredNeeded.length})` },
          { id: "issued", label: `Material Issued (${filteredIssues.length})` },
          { id: "consumed", label: `Material Consumed (${filteredConsumptions.length})` },
          { id: "payments", label: `Payment Ledger (${filteredPayments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ledgerTab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}
      <section className="card tableCard">
        {/* Tab 1: Material Needed */}
        {activeTab === "needed" && (
          <>
            <div className="tableScroll">
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
                          <span className={`priorityBadge ${(n.priority || "high").toLowerCase()}`}>{n.priority}</span>
                        </td>
                        <td><Badge>{n.status}</Badge></td>
                        <td>
                          <button type="button" className="actionBtn delete" onClick={() => handleDeleteNeeded(n.id)}>
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
            <div className="mobileCardList">
              {filteredNeeded.length === 0 ? (
                <div className="emptyTable">
                  <p>No material requirements recorded.</p>
                </div>
              ) : (
                filteredNeeded.map((n) => (
                  <div key={n.id} className="mobileDataCard">
                    <div className="mobileCardHeader">
                      <div className="mobileCardTitleArea">
                        <h3 className="mobileCardTitle">{n.materialName}</h3>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span className={`priorityBadge ${(n.priority || "high").toLowerCase()}`}>{n.priority}</span>
                        <Badge>{n.status}</Badge>
                      </div>
                    </div>
                    <div className="mobileCardBody">
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Party / Site</span>
                        <strong className="mobileMetricVal">{n.partyName}</strong>
                      </div>
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Quantity</span>
                        <strong className="mobileMetricVal highlight">{n.quantityNeeded} {n.unit}</strong>
                      </div>
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Required Date</span>
                        <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{n.requiredByDate || "—"}</span>
                      </div>
                    </div>
                    <div className="mobileCardFooter">
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {n.remarks ? `Remarks: ${n.remarks}` : "Standard requisition"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteNeeded(n.id)}
                      >
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
            <div className="tableScroll">
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
                        <td><strong>{i.number || i.challanNo}</strong></td>
                        <td>{i.date}</td>
                        <td>{i.department || i.issuedTo}</td>
                        <td>{i.itemsCount || (i.items ? i.items.length : 1)} items</td>
                        <td><Badge>{i.status || "Issued"}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileCardList">
              {filteredIssues.length === 0 ? (
                <div className="emptyTable">
                  <p>No material issue records found.</p>
                </div>
              ) : (
                filteredIssues.map((i, idx) => (
                  <div key={idx} className="mobileDataCard">
                    <div className="mobileCardHeader">
                      <div className="mobileCardTitleArea">
                        <code className="codeBadge">{i.number || i.challanNo}</code>
                        <h3 className="mobileCardTitle" style={{ marginTop: "4px" }}>{i.department || i.issuedTo}</h3>
                      </div>
                      <Badge>{i.status || "Issued"}</Badge>
                    </div>
                    <div className="mobileCardBody">
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Dispatched</span>
                        <strong className="mobileMetricVal highlight">{i.itemsCount || (i.items ? i.items.length : 1)} items</strong>
                      </div>
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Issue Date</span>
                        <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{i.date}</span>
                      </div>
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
            <div className="tableScroll">
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
                        <td>{c.department || c.site}</td>
                        <td>{c.itemsCount || (c.items ? c.items.length : 1)} items</td>
                        <td><Badge>{c.status || "Consumed"}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobileCardList">
              {filteredConsumptions.length === 0 ? (
                <div className="emptyTable">
                  <p>No consumption records found.</p>
                </div>
              ) : (
                filteredConsumptions.map((c, idx) => (
                  <div key={idx} className="mobileDataCard">
                    <div className="mobileCardHeader">
                      <div className="mobileCardTitleArea">
                        <code className="codeBadge">{c.number}</code>
                        <h3 className="mobileCardTitle" style={{ marginTop: "4px" }}>{c.department || c.site}</h3>
                      </div>
                      <Badge>{c.status || "Consumed"}</Badge>
                    </div>
                    <div className="mobileCardBody">
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Items Utilized</span>
                        <strong className="mobileMetricVal highlight">{c.itemsCount || (c.items ? c.items.length : 1)} items</strong>
                      </div>
                      <div className="mobileMetricItem">
                        <span className="mobileMetricLabel">Consumption Date</span>
                        <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{c.date}</span>
                      </div>
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
            <div className="tableScroll">
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
                        <td><b>{formatCurrency(p.totalAmount)}</b></td>
                        <td style={{ color: "var(--green-text)", fontWeight: "700" }}>{formatCurrency(p.amountPaid)}</td>
                        <td style={{ color: p.balanceLeft > 0 ? "var(--red-text)" : "var(--text-secondary)", fontWeight: "700" }}>
                          {formatCurrency(p.balanceLeft)}
                        </td>
                        <td>{p.paymentMode}</td>
                        <td><Badge>{p.status}</Badge></td>
                        <td>
                          <button type="button" className="actionBtn delete" onClick={() => handleDeletePayment(p.id)}>
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
            <div className="mobileCardList">
              {filteredPayments.length === 0 ? (
                <div className="emptyTable">
                  <p>No payment entries recorded.</p>
                </div>
              ) : (
                filteredPayments.map((p) => {
                  const isDue = Number(p.balanceLeft) > 0;

                  return (
                    <div key={p.id} className="mobileDataCard ledgerPaymentCard">
                      <div className="mobileCardHeader">
                        <div className="mobileCardTitleArea">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <code className="codeBadge">{p.invoiceNo || "INV-GEN"}</code>
                            <span className="paymentModeBadge">{p.paymentMode || "NEFT"}</span>
                          </div>
                          <h3 className="mobileCardTitle">{p.partyName}</h3>
                        </div>
                        <Badge>{p.status}</Badge>
                      </div>

                      {/* Primary Financial Metric Strip */}
                      <div className="ledgerFinancialStrip">
                        <div className="ledgerBalanceCol">
                          <span className="ledgerBalanceLabel">Balance Due</span>
                          <strong className={`ledgerBalanceVal ${isDue ? "due" : "settled"}`}>
                            {isDue ? formatCurrency(p.balanceLeft) : "✓ Cleared"}
                          </strong>
                        </div>
                        <div className="ledgerPaidCol">
                          <span className="ledgerBalanceLabel">Amount Paid</span>
                          <strong className="ledgerPaidVal">
                            {formatCurrency(p.amountPaid)}
                          </strong>
                        </div>
                      </div>

                      {/* Tap-to-Expand Transaction Details */}
                      <details className="ledgerExpandable">
                        <summary className="ledgerExpandSummary">
                          <span>📋 Billing & Date Details</span>
                          <span className="expandChevron">▾</span>
                        </summary>
                        <div className="ledgerExpandContent">
                          <div className="ledgerDetailRow">
                            <span className="detailLabel">Total Invoice Amount:</span>
                            <span className="detailVal"><b>{formatCurrency(p.totalAmount)}</b></span>
                          </div>
                          <div className="ledgerDetailRow">
                            <span className="detailLabel">Invoice Date:</span>
                            <span className="detailVal">{p.invoiceDate || "—"}</span>
                          </div>
                          <div className="ledgerDetailRow">
                            <span className="detailLabel">Settlement Mode:</span>
                            <span className="detailVal">{p.paymentMode || "Standard Bank Transfer"}</span>
                          </div>
                          {p.remarks && (
                            <div className="ledgerDetailRow">
                              <span className="detailLabel">Remarks / Ref:</span>
                              <span className="detailVal">{p.remarks}</span>
                            </div>
                          )}
                        </div>
                      </details>

                      <div className="mobileCardFooter">
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {p.invoiceDate ? `Issued: ${p.invoiceDate}` : "Active ledger entry"}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger ledgerDeleteBtn"
                          onClick={() => handleDeletePayment(p.id)}
                          aria-label="Delete entry"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  );
                })
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
              <h3>Request Material</h3>
              <button type="button" className="modalCloseBtn" onClick={() => setIsNeededModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveNeeded}>
              <div className="modalBody formGrid">
                <div>
                  <label>Supplier / Customer / Site Name *</label>
                  <input
                    type="text"
                    required
                    value={newNeeded.partyName}
                    onChange={(e) => setNewNeeded({ ...newNeeded, partyName: e.target.value })}
                  />
                </div>

                <div>
                  <label>Material Specification *</label>
                  <input
                    type="text"
                    required
                    value={newNeeded.materialName}
                    onChange={(e) => setNewNeeded({ ...newNeeded, materialName: e.target.value })}
                  />
                </div>

                <div>
                  <label>Quantity Needed *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newNeeded.quantityNeeded}
                    onChange={(e) => setNewNeeded({ ...newNeeded, quantityNeeded: e.target.value })}
                  />
                </div>

                <div>
                  <label>Unit</label>
                  <input
                    type="text"
                    value={newNeeded.unit}
                    onChange={(e) => setNewNeeded({ ...newNeeded, unit: e.target.value })}
                  />
                </div>

                <div>
                  <label>Required By Date</label>
                  <input
                    type="date"
                    value={newNeeded.requiredByDate}
                    onChange={(e) => setNewNeeded({ ...newNeeded, requiredByDate: e.target.value })}
                  />
                </div>

                <div>
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
              <h3>Record Payment</h3>
              <button type="button" className="modalCloseBtn" onClick={() => setIsPaymentModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modalBody formGrid">
                <div>
                  <label>Party / Supplier / Customer *</label>
                  <input
                    type="text"
                    required
                    value={newPayment.partyName}
                    onChange={(e) => setNewPayment({ ...newPayment, partyName: e.target.value })}
                  />
                </div>

                <div>
                  <label>Invoice / Bill Number *</label>
                  <input
                    type="text"
                    required
                    value={newPayment.invoiceNo}
                    onChange={(e) => setNewPayment({ ...newPayment, invoiceNo: e.target.value })}
                  />
                </div>

                <div>
                  <label>Total Invoiced / Bill Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPayment.totalAmount}
                    onChange={(e) => setNewPayment({ ...newPayment, totalAmount: e.target.value })}
                  />
                </div>

                <div>
                  <label>Amount Received / Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPayment.amountPaid}
                    onChange={(e) => setNewPayment({ ...newPayment, amountPaid: e.target.value })}
                  />
                </div>

                <div>
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

                <div>
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
                <button type="submit" className="primary">
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
