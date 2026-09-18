"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { exportToExcel } from "@/lib/exportToExcel";
import {
  getMasterMaterialCatalog,
  getStorageData,
  setStorageData,
  STORAGE_KEYS,
} from "@/lib/dataService";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "@/components/ui/ui.css";

export default function ReturnsPage() {
  const [returnsList, setReturnsList] = useState([]);
  const [materialCatalog, setMaterialCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState("All");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [newReturn, setNewReturn] = useState({
    movementType: "Return to Warehouse", // "Return to Warehouse" | "Site Transfer" | "Damage / Loss"
    returnNo: `RET-${Date.now().toString().slice(-4)}`,
    date: todayStr,
    sourceSite: "Jaipur Site",
    destinationSite: "Central Warehouse",
    materialName: "",
    quantity: 10,
    unit: "Pcs",
    reason: "",
  });

  useEffect(() => {
    setMaterialCatalog(getMasterMaterialCatalog());
    const data = getStorageData(STORAGE_KEYS.RETURNS, []);
    setReturnsList(data);
  }, []);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
    }
    return () => {
      if (isOpen) unlockScroll();
    };
  }, [isOpen]);

  const saveReturns = (list) => {
    setReturnsList(list);
    setStorageData(STORAGE_KEYS.RETURNS, list);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!newReturn.materialName || !newReturn.quantity) {
      alert("Please choose a material and quantity.");
      return;
    }

    const item = {
      id: Date.now(),
      ...newReturn,
      quantity: Number(newReturn.quantity),
    };

    saveReturns([item, ...returnsList]);
    setIsOpen(false);
    setNewReturn({
      movementType: "Return to Warehouse",
      returnNo: `RET-${Date.now().toString().slice(-4)}`,
      date: todayStr,
      sourceSite: "Jaipur Site",
      destinationSite: "Central Warehouse",
      materialName: "",
      quantity: 10,
      unit: "Pcs",
      reason: "",
    });
  };

  const handleDelete = (id) => {
    if (confirm("Delete this movement record?")) {
      saveReturns(returnsList.filter((r) => r.id !== id));
    }
  };

  const filteredList = returnsList.filter((r) => {
    const matchesSearch =
      !search ||
      (r.materialName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.sourceSite || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.returnNo || "").toLowerCase().includes(search.toLowerCase());

    const matchesType = movementFilter === "All" || r.movementType === movementFilter;
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    exportToExcel({
      filename: "Material_Movement_Report",
      headers: ["Voucher #", "Type", "Date", "Source Site", "Destination", "Material", "Qty", "Reason"],
      rows: filteredList.map((r) => [
        r.returnNo,
        r.movementType,
        r.date,
        r.sourceSite,
        r.destinationSite,
        r.materialName,
        `${r.quantity} ${r.unit}`,
        r.reason,
      ]),
    });
  };

  const materialOptions = materialCatalog.map((m) => ({
    value: m.name,
    label: m.name,
    sublabel: `${m.category} · Unit: ${m.unit}`,
  }));

  return (
    <Shell>
      <Title
        title="Returns & Material Movement"
        desc="Audit ledger for site returns back to warehouse, inter-site transfers, and scrap/damage adjustments."
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="secondary" onClick={handleExport}>
              ⤓ Export Movements
            </button>
            <button type="button" className="primary" onClick={() => setIsOpen(true)}>
              + Record Return / Movement
            </button>
          </div>
        }
      />

      {/* Table Card */}
      <section className="card tableCard">
        <div className="tableControls">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}>
            <div className="invSearchBox" style={{ maxWidth: "280px" }}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search voucher, site, material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="invSelect"
            >
              <option value="All">All Movement Types</option>
              <option value="Return to Warehouse">Return to Warehouse</option>
              <option value="Site Transfer">Site Transfer</option>
              <option value="Damage / Loss">Damage / Loss</option>
            </select>
          </div>

          <span className="tableCountHint">
            Showing <strong>{filteredList.length}</strong> of <strong>{returnsList.length}</strong> records
          </span>
        </div>

        {/* Mobile-first compact cards (hidden on desktop) */}
        <div className="mobileCardList">
          {filteredList.length === 0 ? (
            <div className="emptyTable">
              <p>No returns or movement logs recorded yet.</p>
              <button
                type="button"
                className="primary"
                style={{ marginTop: "8px" }}
                onClick={() => setIsOpen(true)}
              >
                + Record First Return
              </button>
            </div>
          ) : (
            filteredList.map((r) => (
              <div key={r.id} className="mobileDataCard">
                <div className="mobileCardHeader">
                  <div className="mobileCardTitleArea">
                    <code className="codeBadge">{r.returnNo}</code>
                    <h3 className="mobileCardTitle" style={{ marginTop: "4px" }}>{r.materialName}</h3>
                  </div>
                  <Badge
                    variant={
                      r.movementType === "Return to Warehouse"
                        ? "purple"
                        : r.movementType === "Damage / Loss"
                        ? "danger"
                        : "info"
                    }
                  >
                    {r.movementType}
                  </Badge>
                </div>

                <div className="mobileCardBody">
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Quantity</span>
                    <strong className="mobileMetricVal highlight">{r.quantity} {r.unit}</strong>
                  </div>
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Movement Date</span>
                    <span className="mobileMetricVal" style={{ fontSize: "13.5px" }}>{r.date}</span>
                  </div>
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">From Site</span>
                    <span className="mobileMetricVal" style={{ fontSize: "12.5px" }}>{r.sourceSite}</span>
                  </div>
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">To Destination</span>
                    <span className="mobileMetricVal" style={{ fontSize: "12.5px" }}>{r.destinationSite}</span>
                  </div>
                </div>

                <div className="mobileCardFooter">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {r.reason ? `Note: ${r.reason}` : "Standard movement"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Movement Type</th>
                <th>Date</th>
                <th>Source Site</th>
                <th>Destination</th>
                <th>Material</th>
                <th>Quantity</th>
                <th>Reason / Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="emptyTable">
                    <p>No returns or movement logs recorded yet.</p>
                    <button
                      type="button"
                      className="primary"
                      style={{ marginTop: "8px" }}
                      onClick={() => setIsOpen(true)}
                    >
                      + Record First Return
                    </button>
                  </td>
                </tr>
              ) : (
                filteredList.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.returnNo}</strong></td>
                    <td>
                      <Badge
                        variant={
                          r.movementType === "Return to Warehouse"
                            ? "purple"
                            : r.movementType === "Damage / Loss"
                            ? "danger"
                            : "info"
                        }
                      >
                        {r.movementType}
                      </Badge>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.sourceSite}</td>
                    <td>{r.destinationSite}</td>
                    <td><strong>{r.materialName}</strong></td>
                    <td>
                      <b>{r.quantity}</b> {r.unit}
                    </td>
                    <td>{r.reason || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="actionBtn delete"
                        onClick={() => handleDelete(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Movement Modal */}
      {isOpen && (
        <div className="modalBackdrop" onClick={() => setIsOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Record Material Return / Movement</h3>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label>
                  Movement Type *
                  <select
                    value={newReturn.movementType}
                    onChange={(e) =>
                      setNewReturn({ ...newReturn, movementType: e.target.value })
                    }
                  >
                    <option value="Return to Warehouse">Return to Warehouse (Inward)</option>
                    <option value="Site Transfer">Inter-Site Transfer</option>
                    <option value="Damage / Loss">Damage / Scrap Adjustment</option>
                  </select>
                </label>

                <div className="formGridResponsive">
                  <label>
                    Voucher Reference *
                    <input
                      type="text"
                      required
                      value={newReturn.returnNo}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, returnNo: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Date *
                    <input
                      type="date"
                      required
                      value={newReturn.date}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, date: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="formGridResponsive">
                  <label>
                    Source Site / Department *
                    <input
                      type="text"
                      required
                      value={newReturn.sourceSite}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, sourceSite: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Destination Location *
                    <input
                      type="text"
                      required
                      value={newReturn.destinationSite}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, destinationSite: e.target.value })
                      }
                    />
                  </label>
                </div>

                <SearchableSelect
                  label="Material Description"
                  required
                  options={materialOptions}
                  value={newReturn.materialName}
                  onChange={(val) => {
                    const found = materialCatalog.find((m) => m.name === val);
                    setNewReturn({
                      ...newReturn,
                      materialName: val,
                      unit: found ? found.unit : "Pcs",
                    });
                  }}
                  placeholder="Select material..."
                />

                <div className="formGridResponsive">
                  <label>
                    Quantity Returned *
                    <input
                      type="number"
                      required
                      min="1"
                      value={newReturn.quantity}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, quantity: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Unit
                    <input
                      type="text"
                      value={newReturn.unit}
                      onChange={(e) =>
                        setNewReturn({ ...newReturn, unit: e.target.value })
                      }
                    />
                  </label>
                </div>

                <label>
                  Reason / Condition Notes
                  <textarea
                    placeholder="Excess material return, site completed, defect, transfer reason..."
                    value={newReturn.reason}
                    onChange={(e) =>
                      setNewReturn({ ...newReturn, reason: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Save Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
