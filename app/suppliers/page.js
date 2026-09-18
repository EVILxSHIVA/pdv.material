"use client";

import { useState, useEffect, useMemo } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import DetailDrawer from "@/components/ui/DetailDrawer";
import { exportToExcel } from "@/lib/exportToExcel";
import {
  getStorageData,
  setStorageData,
  STORAGE_KEYS,
  DEFAULT_SUPPLIERS,
} from "@/lib/dataService";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "@/components/ui/ui.css";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    contact: "",
    mobile: "",
    email: "",
    gst: "",
    status: "Active",
  });

  useEffect(() => {
    let saved = getStorageData(STORAGE_KEYS.SUPPLIERS, []);
    if (saved.length === 0) {
      saved = DEFAULT_SUPPLIERS;
      setStorageData(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    }
    setSuppliers(saved);
    setPurchases(getStorageData(STORAGE_KEYS.PURCHASES, []));
    setPayments(getStorageData(STORAGE_KEYS.PAYMENTS, []));
    setBills(getStorageData(STORAGE_KEYS.BILLS, []));
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      lockScroll();
    }
    return () => {
      if (isModalOpen) unlockScroll();
    };
  }, [isModalOpen]);

  const saveList = (list) => {
    setSuppliers(list);
    setStorageData(STORAGE_KEYS.SUPPLIERS, list);
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({
      code: `SUP-${String(suppliers.length + 1).padStart(3, "0")}`,
      name: "",
      contact: "",
      mobile: "",
      email: "",
      gst: "",
      status: "Active",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup, idx) => {
    setModalMode("edit");
    setEditIndex(idx);
    setFormData({
      code: Array.isArray(sup) ? sup[0] : sup.code,
      name: Array.isArray(sup) ? sup[1] : sup.name,
      contact: Array.isArray(sup) ? sup[2] : sup.contactPerson,
      mobile: Array.isArray(sup) ? sup[3] : sup.mobile,
      email: Array.isArray(sup) ? sup[4] : sup.email,
      gst: Array.isArray(sup) ? sup[5] : sup.gst,
      status: Array.isArray(sup) ? sup[6] : sup.status || "Active",
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Supplier Name is required.");
      return;
    }

    const row = [
      formData.code,
      formData.name,
      formData.contact,
      formData.mobile,
      formData.email,
      formData.gst,
      formData.status,
    ];

    if (modalMode === "add") {
      saveList([row, ...suppliers]);
    } else if (editIndex !== null) {
      const copy = [...suppliers];
      copy[editIndex] = row;
      saveList(copy);
      if (selectedSupplier) {
        setSelectedSupplier(row);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (index) => {
    if (confirm("Delete this supplier?")) {
      saveList(suppliers.filter((_, i) => i !== index));
      setSelectedSupplier(null);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const name = Array.isArray(s) ? s[1] : s.name;
    const code = Array.isArray(s) ? s[0] : s.code;
    const contact = Array.isArray(s) ? s[2] : s.contactPerson;

    return (
      !search ||
      String(name).toLowerCase().includes(search.toLowerCase()) ||
      String(code).toLowerCase().includes(search.toLowerCase()) ||
      String(contact).toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleExport = () => {
    const headers = ["Supplier Code", "Supplier Name", "Contact Person", "Mobile", "Email", "GSTIN", "Status"];
    const rows = filteredSuppliers.map((s) => (Array.isArray(s) ? s : [s.code, s.name, s.contactPerson, s.mobile, s.email, s.gst, s.status]));
    exportToExcel({ filename: "Suppliers_Directory", headers, rows });
  };

  // Supplier-specific drilldowns
  const supName = selectedSupplier ? (Array.isArray(selectedSupplier) ? selectedSupplier[1] : selectedSupplier.name) : "";
  const supPurchases = purchases.filter((p) => {
    const pSup = p.supplier || (Array.isArray(p) ? p[2] : "");
    return pSup && supName && pSup.toLowerCase().includes(supName.toLowerCase());
  });
  const supPayments = payments.filter((p) => {
    const pParty = p.partyName || "";
    return pParty && supName && pParty.toLowerCase().includes(supName.toLowerCase());
  });
  const supBills = bills.filter((b) => {
    const bSup = b.supplierName || "";
    return bSup && supName && bSup.toLowerCase().includes(supName.toLowerCase());
  });

  const totalSupBilled = supPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalSupPaid = supPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalSupDue = Math.max(0, totalSupBilled - totalSupPaid);

  const supplierTabs = [
    { id: "overview", label: "Overview", icon: "🏢" },
    { id: "purchases", label: "Purchases", icon: "▣", count: supPurchases.length },
    { id: "payments", label: "Payments", icon: "⚖", count: supPayments.length },
    { id: "documents", label: "Documents", icon: "🧾", count: supBills.length },
  ];

  return (
    <Shell>
      <Title
        title="Suppliers Directory"
        desc="Manage supplier contacts, procurement history, invoices, and payment ledger."
        action={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="secondary" onClick={handleExport}>
              ⤓ Export Directory
            </button>
            <button type="button" className="primary" onClick={handleOpenAdd}>
              + Add Supplier
            </button>
          </div>
        }
      />

      {/* Table Card */}
      <section className="card tableCard">
        <div className="tableControls">
          <div className="invSearchBox" style={{ maxWidth: "320px" }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search supplier name, code, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span className="tableCountHint">
            Showing <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> suppliers
          </span>
        </div>

        {/* Mobile-first compact cards (hidden on desktop) */}
        <div className="mobileCardList">
          {filteredSuppliers.length === 0 ? (
            <div className="emptyTable">
              <p>No suppliers match your search.</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "8px" }}
                onClick={() => setSearch("")}
              >
                Reset Search
              </button>
            </div>
          ) : (
            filteredSuppliers.map((s, idx) => {
              const code = Array.isArray(s) ? s[0] : s.code;
              const name = Array.isArray(s) ? s[1] : s.name;
              const contact = Array.isArray(s) ? s[2] : s.contactPerson;
              const mobile = Array.isArray(s) ? s[3] : s.mobile;
              const gst = Array.isArray(s) ? s[5] : s.gst;
              const stat = Array.isArray(s) ? s[6] : s.status || "Active";

              return (
                <div
                  key={idx}
                  className="mobileDataCard"
                  onClick={() => {
                    setSelectedSupplier(s);
                    setDrawerTab("overview");
                  }}
                >
                  <div className="mobileCardHeader">
                    <div className="mobileCardTitleArea">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <code className="codeBadge">{code}</code>
                      </div>
                      <h3 className="mobileCardTitle">{name}</h3>
                    </div>
                    <Badge>{stat}</Badge>
                  </div>

                  <div className="mobileCardBody">
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Contact Person</span>
                      <strong className="mobileMetricVal">{contact || "—"}</strong>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">Mobile</span>
                      <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{mobile || "—"}</span>
                    </div>
                    <div className="mobileMetricItem">
                      <span className="mobileMetricLabel">GSTIN</span>
                      <span className="mobileMetricVal" style={{ fontSize: "12px", fontFamily: "monospace" }}>{gst || "—"}</span>
                    </div>
                  </div>

                  <div className="mobileCardFooter">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(s, idx);
                      }}
                    >
                      ✎ Edit
                    </button>
                    <button
                      type="button"
                      className="mobilePrimaryAction"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplier(s);
                        setDrawerTab("overview");
                      }}
                    >
                      Inspect Ledger →
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
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Mobile Number</th>
                <th>GSTIN</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="emptyTable">
                    <p>No suppliers match your search.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s, idx) => {
                  const code = Array.isArray(s) ? s[0] : s.code;
                  const name = Array.isArray(s) ? s[1] : s.name;
                  const contact = Array.isArray(s) ? s[2] : s.contactPerson;
                  const mobile = Array.isArray(s) ? s[3] : s.mobile;
                  const gst = Array.isArray(s) ? s[5] : s.gst;
                  const stat = Array.isArray(s) ? s[6] : s.status || "Active";

                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        setSelectedSupplier(s);
                        setDrawerTab("overview");
                      }}
                    >
                      <td>
                        <code className="codeBadge">{code}</code>
                      </td>
                      <td>
                        <strong>{name}</strong>
                      </td>
                      <td>{contact || "—"}</td>
                      <td>{mobile || "—"}</td>
                      <td>
                        <small style={{ fontFamily: "monospace" }}>{gst || "—"}</small>
                      </td>
                      <td>
                        <Badge>{stat}</Badge>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="actionBtn view"
                            onClick={() => {
                              setSelectedSupplier(s);
                              setDrawerTab("overview");
                            }}
                          >
                            Inspect →
                          </button>
                          <button
                            type="button"
                            className="actionBtn edit"
                            onClick={() => handleOpenEdit(s, idx)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Supplier Profile Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        title={supName || "Supplier Profile"}
        subtitle={`Code: ${Array.isArray(selectedSupplier) ? selectedSupplier[0] : selectedSupplier?.code}`}
        badge={<Badge>{Array.isArray(selectedSupplier) ? selectedSupplier[6] : selectedSupplier?.status || "Active"}</Badge>}
        tabs={supplierTabs}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        footerActions={
          <button
            type="button"
            className="secondary"
            onClick={() => setSelectedSupplier(null)}
          >
            Close
          </button>
        }
      >
        {selectedSupplier && (
          <div>
            {/* Tab 1: Overview */}
            {drawerTab === "overview" && (
              <div>
                <div className="drawerMetricGrid">
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Total Invoiced</span>
                    <strong className="drawerMetricVal">₹ {totalSupBilled.toLocaleString()}</strong>
                  </div>
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Amount Settled</span>
                    <strong className="drawerMetricVal" style={{ color: "var(--green-text)" }}>
                      ₹ {totalSupPaid.toLocaleString()}
                    </strong>
                  </div>
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Outstanding Due</span>
                    <strong className="drawerMetricVal" style={{ color: totalSupDue > 0 ? "var(--red-text)" : "inherit" }}>
                      ₹ {totalSupDue.toLocaleString()}
                    </strong>
                  </div>
                </div>

                <h4 className="drawerSectionTitle">Contact Information</h4>
                <div className="drawerKvList">
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Contact Person:</span>
                    <span className="drawerKvVal">{Array.isArray(selectedSupplier) ? selectedSupplier[2] : selectedSupplier.contactPerson || "—"}</span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Mobile Phone:</span>
                    <span className="drawerKvVal">{Array.isArray(selectedSupplier) ? selectedSupplier[3] : selectedSupplier.mobile || "—"}</span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Email Address:</span>
                    <span className="drawerKvVal">{Array.isArray(selectedSupplier) ? selectedSupplier[4] : selectedSupplier.email || "—"}</span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">GSTIN Registration:</span>
                    <span className="drawerKvVal" style={{ fontFamily: "monospace" }}>
                      {Array.isArray(selectedSupplier) ? selectedSupplier[5] : selectedSupplier.gst || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Purchases */}
            {drawerTab === "purchases" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr><th>PI #</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {supPurchases.length === 0 ? (
                      <tr><td colSpan={5} className="emptyTable"><p>No purchases logged from this vendor yet.</p></td></tr>
                    ) : (
                      supPurchases.map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.piNumber || (Array.isArray(p) ? p[0] : "—")}</strong></td>
                          <td>{p.piDate || (Array.isArray(p) ? p[1] : "—")}</td>
                          <td>{p.itemsCount || 1} items</td>
                          <td><strong>{p.totalAmount || (Array.isArray(p) ? p[5] : "—")}</strong></td>
                          <td><Badge>{p.status || (Array.isArray(p) ? p[6] : "Approved")}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Payments */}
            {drawerTab === "payments" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr><th>Invoice #</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {supPayments.length === 0 ? (
                      <tr><td colSpan={5} className="emptyTable"><p>No payment entries logged for this vendor.</p></td></tr>
                    ) : (
                      supPayments.map((pay, i) => (
                        <tr key={i}>
                          <td><strong>{pay.invoiceNo}</strong></td>
                          <td>₹ {Number(pay.totalAmount).toLocaleString()}</td>
                          <td style={{ color: "var(--green-text)", fontWeight: 700 }}>₹ {Number(pay.amountPaid).toLocaleString()}</td>
                          <td style={{ color: pay.balanceLeft > 0 ? "var(--red-text)" : "inherit", fontWeight: 700 }}>₹ {Number(pay.balanceLeft).toLocaleString()}</td>
                          <td><Badge>{pay.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Documents */}
            {drawerTab === "documents" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr><th>Type</th><th>Bill #</th><th>Amount</th><th>File</th></tr>
                  </thead>
                  <tbody>
                    {supBills.length === 0 ? (
                      <tr><td colSpan={4} className="emptyTable"><p>No soft copies attached for this supplier.</p></td></tr>
                    ) : (
                      supBills.map((b) => (
                        <tr key={b.id}>
                          <td><Badge>{b.billType}</Badge></td>
                          <td><strong>{b.billNumber}</strong></td>
                          <td>{b.amount}</td>
                          <td>
                            <a href={b.fileData} download={b.fileName} style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                              📎 {b.fileName}
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modalBackdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>{modalMode === "add" ? "Add New Supplier" : "Edit Supplier"}</h3>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveModal}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
                <div className="formGridResponsive">
                  <label>
                    Supplier Code *
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </label>
                  <label>
                    Supplier Name *
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </label>
                </div>

                <div className="formGridResponsive">
                  <label>
                    Contact Person
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    />
                  </label>
                  <label>
                    Mobile Phone
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </label>
                </div>

                <div className="formGridResponsive">
                  <label>
                    Email Address
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </label>
                  <label>
                    GSTIN Number
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15-character GSTIN"
                      value={formData.gst}
                      onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
