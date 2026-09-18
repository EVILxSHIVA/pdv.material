"use client";

import { useState, useEffect, useMemo } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import DetailDrawer from "@/components/ui/DetailDrawer";
import { exportToExcel } from "@/lib/exportToExcel";
import { calculateLiveInventory } from "@/lib/dataService";
import "@/components/ui/ui.css";
import "./inventory.css";

const CATEGORIES = [
  "All Categories",
  "Pipes & Fittings",
  "Valves & Meters",
  "Tools & Equipment",
  "Safety & PPE",
  "Fasteners & Hardware",
  "General Materials",
];

const STATUS_FILTERS = ["All Statuses", "Good", "Low", "Critical"];

export default function InventoryView({ initialFilter = "" }) {
  const [inventoryList, setInventoryList] = useState(() => calculateLiveInventory());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState(
    initialFilter === "low" ? "Low" : "All Statuses"
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");

  useEffect(() => {
    setInventoryList(calculateLiveInventory());
  }, []);

  // Filtered dataset
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const cat = String(item.category || "").toLowerCase();
      const loc = String(item.location || "").toLowerCase();
      const s = search.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || cat.includes(s) || loc.includes(s);

      const matchesCat =
        selectedCategory === "All Categories" || item.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All Statuses"
          ? true
          : selectedStatus === "Low"
          ? item.status === "Low" || item.status === "Critical"
          : item.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [inventoryList, search, selectedCategory, selectedStatus]);

  // Aggregates
  const totalStockUnits = inventoryList.reduce((sum, i) => sum + i.availableStock, 0);
  const totalStockVal = inventoryList.reduce((sum, i) => sum + i.stockValue, 0);
  const lowCount = inventoryList.filter((i) => i.status === "Low" || i.status === "Critical").length;

  const handleExport = () => {
    const headers = [
      "Material Name",
      "Category",
      "Available Stock",
      "Unit",
      "Status",
      "Location",
      "Rate (₹)",
      "Stock Value (₹)",
    ];
    const rows = filteredInventory.map((i) => [
      i.name,
      i.category,
      i.availableStock,
      i.unit,
      i.status,
      i.location,
      i.rate,
      i.stockValue,
    ]);
    exportToExcel({ filename: "Inventory_Stock_Report", headers, rows });
  };

  const drawerTabs = [
    { id: "overview", label: "Overview", icon: "📋" },
    {
      id: "purchases",
      label: "Purchases",
      icon: "▣",
      count: selectedProduct?.recentPurchases?.length || 0,
    },
    {
      id: "issues",
      label: "Issues to Site",
      icon: "↗",
      count: selectedProduct?.recentIssues?.length || 0,
    },
    {
      id: "consumptions",
      label: "Site Usage",
      icon: "◔",
      count: selectedProduct?.recentConsumptions?.length || 0,
    },
  ];

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <Shell>
      <Title
        title="Inventory Master"
        desc="Live calculated physical stock derived from purchases, dispatches, and site movements."
        action={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExport}>
              ⤓ Export Stock
            </button>
          </div>
        }
      />

      {/* 1. Inventory Metric Bar */}
      <div className="inventorySummaryRow">
        <div className="invStatBox">
          <span className="invStatLabel">Total Catalog Items</span>
          <strong className="invStatVal">{inventoryList.length} Materials</strong>
        </div>
        <div className="invStatBox">
          <span className="invStatLabel">Physical Available Units</span>
          <strong className="invStatVal">{totalStockUnits.toLocaleString()}</strong>
        </div>
        <div className="invStatBox">
          <span className="invStatLabel">Inventory Value</span>
          <strong className="invStatVal">₹ {totalStockVal.toLocaleString()}</strong>
        </div>
        <div className={`invStatBox ${lowCount > 0 ? "danger" : ""}`}>
          <span className="invStatLabel">Low Stock Alert</span>
          <strong className="invStatVal">{lowCount} Items</strong>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <section className="card tableCard">
        <div className="tableControls">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
            <div className="invSearchBox">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search material, category, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="clearBtn" onClick={() => setSearch("")}>
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: "42px", padding: "0 12px", whiteSpace: "nowrap" }}
              onClick={() => setIsFilterOpen(true)}
            >
              Filter ▾ {(selectedCategory !== "All Categories" || selectedStatus !== "All Statuses") ? "(Active)" : ""}
            </button>
          </div>

          <div className="tableCountHint">
            Showing <strong>{filteredInventory.length}</strong> of <strong>{inventoryList.length}</strong> items
          </div>
        </div>

        {/* 1. Mobile-First Data Cards (Zero Horizontal Scroll on <= 768px) */}
        <div className="mobileCardList">
          {filteredInventory.length === 0 ? (
            <div className="emptyTable">
              <p>No materials match your filter criteria.</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All Categories");
                  setSelectedStatus("All Statuses");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredInventory.map((item) => (
              <div
                key={item.code}
                className="mobileDataCard"
                onClick={() => {
                  setSelectedProduct(item);
                  setDrawerTab("overview");
                }}
              >
                <div className="mobileCardHeader">
                  <div className="mobileCardTitleArea">
                    <div style={{ marginBottom: "4px" }}>
                      <span className="categoryTag" style={{ fontSize: "11px" }}>{item.category}</span>
                    </div>
                    <h3 className="mobileCardTitle">{item.name}</h3>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>

                <div className="mobileCardBody">
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Available Stock</span>
                    <strong className="mobileMetricVal highlight">
                      {item.availableStock} {item.unit}
                    </strong>
                  </div>
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Std Rate</span>
                    <strong className="mobileMetricVal">₹ {item.rate}</strong>
                  </div>
                </div>

                <div className="mobileCardFooter">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    📍 {item.location}
                  </span>
                  <button
                    type="button"
                    className="actionBtn view"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(item);
                      setDrawerTab("overview");
                    }}
                  >
                    Inspect History →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Data Table (Visible on > 768px) */}
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Material Description</th>
                <th>Category</th>
                <th>Available Stock</th>
                <th>Status</th>
                <th>Location</th>
                <th>Rate (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="emptyTable">
                    <p>No materials match your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr
                    key={item.name}
                    onClick={() => {
                      setSelectedProduct(item);
                      setDrawerTab("overview");
                    }}
                  >
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.category}</td>
                    <td>
                      <b className="stockNumber">{item.availableStock}</b> {item.unit}
                    </td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>{item.location}</td>
                    <td>₹ {item.rate}</td>
                    <td>
                      <button
                        type="button"
                        className="actionBtn view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(item);
                          setDrawerTab("overview");
                        }}
                      >
                        Inspect History →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filter Bottom Sheet */}
      <DetailDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Inventory"
        subtitle="Filter material stock by category and health status"
        footerActions={
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setSelectedCategory("All Categories");
                setSelectedStatus("All Statuses");
                setIsFilterOpen(false);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setIsFilterOpen(false)}
            >
              Apply Filter
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Category
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="invSelect"
              style={{ width: "100%" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Stock Health Status
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="invSelect"
              style={{ width: "100%" }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DetailDrawer>

      {/* 3. Product Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Product History"}
        subtitle={`Category: ${selectedProduct?.category} · Location: ${selectedProduct?.location}`}
        badge={<Badge>{selectedProduct?.status}</Badge>}
        tabs={drawerTabs}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        footerActions={
          <button
            type="button"
            className="secondary"
            onClick={() => setSelectedProduct(null)}
          >
            Close
          </button>
        }
      >
        {selectedProduct && (
          <div>
            {/* Tab 1: Overview */}
            {drawerTab === "overview" && (
              <div>
                <div className="drawerMetricGrid">
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Available Stock</span>
                    <strong className="drawerMetricVal">
                      {selectedProduct.availableStock} {selectedProduct.unit}
                    </strong>
                  </div>
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Storage Location</span>
                    <strong className="drawerMetricVal" style={{ fontSize: "14px" }}>
                      {selectedProduct.location}
                    </strong>
                  </div>
                  <div className="drawerMetricCard">
                    <span className="drawerMetricLabel">Standard Rate</span>
                    <strong className="drawerMetricVal">₹ {selectedProduct.rate}</strong>
                  </div>
                </div>

                <h4 className="drawerSectionTitle">Material Master Data</h4>
                <div className="drawerKvList">
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Category:</span>
                    <span className="drawerKvVal">{selectedProduct.category}</span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Storage Location:</span>
                    <span className="drawerKvVal">{selectedProduct.location}</span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Inventory Valuation:</span>
                    <span className="drawerKvVal">
                      ₹ {(selectedProduct.availableStock * (selectedProduct.rate || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <h4 className="drawerSectionTitle" style={{ marginTop: "20px" }}>
                  Material Flow Summary
                </h4>
                <div className="drawerKvList">
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Total Purchased (Inward):</span>
                    <span className="drawerKvVal" style={{ color: "var(--brand-600)" }}>
                      +{selectedProduct.totalPurchased} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Total Issued (To Sites):</span>
                    <span className="drawerKvVal" style={{ color: "var(--orange-text)" }}>
                      -{selectedProduct.totalIssued} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Recorded Consumed at Site:</span>
                    <span className="drawerKvVal" style={{ color: "var(--green-text)" }}>
                      {selectedProduct.totalConsumed} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="drawerKvRow">
                    <span className="drawerKvLabel">Net Physical Available:</span>
                    <span className="drawerKvVal" style={{ fontWeight: 800 }}>
                      {selectedProduct.availableStock} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Purchases */}
            {drawerTab === "purchases" && (
              <div className="drawerTimeline">
                {selectedProduct.recentPurchases.length === 0 ? (
                  <p className="emptyTable">No inward purchases logged for this item yet.</p>
                ) : (
                  selectedProduct.recentPurchases.map((p, idx) => (
                    <div key={idx} className="timelineRow">
                      <div className="timelineDot in" />
                      <div className="timelineContent">
                        <div className="timelineHeader">
                          <b>PI / PO #{p.poNumber}</b>
                          <span className="timelineDate">{p.date}</span>
                        </div>
                        <p className="timelineSub">Supplier: {p.supplier}</p>
                        <div className="timelineQty">
                          Qty: +{p.quantity} {selectedProduct.unit} @ ₹{p.rate}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Issues */}
            {drawerTab === "issues" && (
              <div className="drawerTimeline">
                {selectedProduct.recentIssues.length === 0 ? (
                  <p className="emptyTable">No dispatches to site logged for this item yet.</p>
                ) : (
                  selectedProduct.recentIssues.map((iss, idx) => (
                    <div key={idx} className="timelineRow">
                      <div className="timelineDot out" />
                      <div className="timelineContent">
                        <div className="timelineHeader">
                          <b>Voucher #{iss.voucherNo}</b>
                          <span className="timelineDate">{iss.date}</span>
                        </div>
                        <p className="timelineSub">Issued to: {iss.department}</p>
                        <div className="timelineQty out">
                          Dispatched: -{iss.quantity} {selectedProduct.unit}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Consumptions */}
            {drawerTab === "consumptions" && (
              <div className="drawerTimeline">
                {selectedProduct.recentConsumptions.length === 0 ? (
                  <p className="emptyTable">No site consumption recorded for this item yet.</p>
                ) : (
                  selectedProduct.recentConsumptions.map((c, idx) => (
                    <div key={idx} className="timelineRow">
                      <div className="timelineDot used" />
                      <div className="timelineContent">
                        <div className="timelineHeader">
                          <b>Consumption #{c.consumptionNo}</b>
                          <span className="timelineDate">{c.date}</span>
                        </div>
                        <p className="timelineSub">Site: {c.department} · By: {c.usedBy || "Site Engineer"}</p>
                        <div className="timelineQty used">
                          Utilized: {c.quantity} {selectedProduct.unit}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </Shell>
  );
}
