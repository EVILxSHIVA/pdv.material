"use client";

import { useState, useEffect, useMemo } from "react";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import DetailDrawer from "@/components/ui/DetailDrawer";
import { exportToExcel } from "@/lib/exportToExcel";
import {
  calculateLiveInventory,
  getMasterMaterialCatalog,
  getStorageData,
  setStorageData,
  STORAGE_KEYS,
} from "@/lib/dataService";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "@/components/ui/ui.css";

const CATEGORIES = [
  "All Categories",
  "Pipes & Fittings",
  "Valves & Meters",
  "Tools & Equipment",
  "Safety & PPE",
  "Fasteners & Hardware",
  "General Materials",
];

export default function ProductsPage() {
  const [productsList, setProductsList] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Pipes & Fittings",
    unit: "Pcs",
    reorderLevel: 20,
    rate: 150,
    location: "Central Warehouse",
    supplier: "",
    status: "Active",
  });

  useEffect(() => {
    setProductsList(calculateLiveInventory());
  }, []);

  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({
      code: `PRD-${String(productsList.length + 1).padStart(3, "0")}`,
      name: "",
      category: "Pipes & Fittings",
      unit: "Pcs",
      reorderLevel: 20,
      rate: 150,
      location: "Central Warehouse",
      supplier: "",
      status: "Active",
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isModalOpen) {
      lockScroll();
    }
    return () => {
      if (isModalOpen) unlockScroll();
    };
  }, [isModalOpen]);

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Material Description is required.");
      return;
    }

    const row = [
      formData.code,
      formData.name,
      "",
      formData.category,
      formData.unit,
      formData.supplier,
      formData.rate,
      "18%",
      "",
      "",
      formData.reorderLevel,
      formData.location,
      "",
      formData.status,
    ];

    const currentCustom = getStorageData(STORAGE_KEYS.PRODUCTS, []);
    setStorageData(STORAGE_KEYS.PRODUCTS, [row, ...currentCustom]);
    setProductsList(calculateLiveInventory());
    setIsModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const loc = (p.location || "").toLowerCase();
      const s = search.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || cat.includes(s) || loc.includes(s);

      const matchesCat =
        categoryFilter === "All Categories" || p.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [productsList, search, categoryFilter]);

  const handleExport = () => {
    const headers = [
      "Material Name",
      "Category",
      "Unit",
      "Available Stock",
      "Rate (₹)",
      "Location",
      "Status",
    ];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.category,
      p.unit,
      p.availableStock,
      p.rate,
      p.location,
      p.status,
    ]);
    exportToExcel({ filename: "Product_Master_Catalog", headers, rows });
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <Shell>
      <Title
        title="Product Master Data"
        desc="Centralized specifications, standard rates, stock thresholds, and material catalog."
        action={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleExport}>
              ⤓ Export
            </button>
            <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={handleOpenAdd}>
              + Add Product
            </button>
          </div>
        }
      />

      {/* Table & Mobile Card Card */}
      <section className="card tableCard">
        <div className="tableControls">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
            <div className="invSearchBox">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search material or category..."
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
              Filter ▾ {categoryFilter !== "All Categories" ? `(1)` : ""}
            </button>
          </div>

          <span className="tableCountHint">
            Showing <strong>{filteredProducts.length}</strong> of <strong>{productsList.length}</strong> items
          </span>
        </div>

        {/* 1. Mobile-First Compact Data Cards (Zero Horizontal Scroll on <= 768px) */}
        <div className="mobileCardList">
          {filteredProducts.length === 0 ? (
            <div className="emptyTable">
              <p>No products match your search or filter.</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All Categories");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.code}
                className="mobileDataCard"
                onClick={() => setSelectedProduct(p)}
              >
                <div className="mobileCardHeader">
                  <div className="mobileCardTitleArea">
                    <div style={{ marginBottom: "4px" }}>
                      <span className="categoryTag" style={{ fontSize: "11px" }}>{p.category}</span>
                    </div>
                    <h3 className="mobileCardTitle">{p.name}</h3>
                  </div>
                  <Badge>{p.status}</Badge>
                </div>

                <div className="mobileCardBody">
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Available Stock</span>
                    <strong className="mobileMetricVal highlight">
                      {p.availableStock} {p.unit}
                    </strong>
                  </div>
                  <div className="mobileMetricItem">
                    <span className="mobileMetricLabel">Std Rate</span>
                    <strong className="mobileMetricVal">₹ {p.rate}</strong>
                  </div>
                </div>

                <div className="mobileCardFooter">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    📍 {p.location}
                  </span>
                  <button
                    type="button"
                    className="actionBtn view"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(p);
                    }}
                  >
                    Inspect Specs →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Data Table (Gracefully visible on > 768px) */}
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Material Description</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Available Stock</th>
                <th>Std Rate (₹)</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="emptyTable">
                    <p>No products match your search.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.name} onClick={() => setSelectedProduct(p)}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.category}</td>
                    <td>{p.unit}</td>
                    <td>
                      <b>{p.availableStock}</b> {p.unit}
                    </td>
                    <td>₹ {p.rate}</td>
                    <td>{p.location}</td>
                    <td>
                      <Badge>{p.status}</Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="actionBtn view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                        }}
                      >
                        Inspect →
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
        title="Filter Products"
        subtitle="Narrow down catalog items by category and parameters"
        footerActions={
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setCategoryFilter("All Categories");
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
        </div>
      </DetailDrawer>

      {/* Product Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Product History"}
        subtitle={`Category: ${selectedProduct?.category} · Location: ${selectedProduct?.location}`}
        badge={<Badge>{selectedProduct?.status}</Badge>}
        footerActions={
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setSelectedProduct(null)}
            >
              Close
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div>
            <div className="drawerMetricGrid">
              <div className="drawerMetricCard">
                <span className="drawerMetricLabel">Available Stock</span>
                <strong className="drawerMetricVal" style={{ color: "var(--brand-600)" }}>
                  {selectedProduct.availableStock} {selectedProduct.unit}
                </strong>
              </div>
              <div className="drawerMetricCard">
                <span className="drawerMetricLabel">Std Rate</span>
                <strong className="drawerMetricVal">₹ {selectedProduct.rate}</strong>
              </div>
            </div>

            <h4 className="drawerSectionTitle">Material Specifications & Rates</h4>
            <div className="drawerKvList">
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Material Description:</span>
                <span className="drawerKvVal">{selectedProduct.name}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Category:</span>
                <span className="drawerKvVal">{selectedProduct.category}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Unit of Measure:</span>
                <span className="drawerKvVal">{selectedProduct.unit}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Base Rate:</span>
                <span className="drawerKvVal">₹ {selectedProduct.rate} per {selectedProduct.unit}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Applicable GST:</span>
                <span className="drawerKvVal">18% (₹ {(selectedProduct.rate * 0.18).toFixed(2)})</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Rate incl. GST:</span>
                <span className="drawerKvVal" style={{ color: "var(--brand-700)" }}>
                  ₹ {(selectedProduct.rate * 1.18).toFixed(2)}
                </span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Storage Location:</span>
                <span className="drawerKvVal">{selectedProduct.location || "Central Warehouse"}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Primary Supplier:</span>
                <span className="drawerKvVal">{selectedProduct.supplier || "Approved Suppliers"}</span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Inventory Valuation:</span>
                <span className="drawerKvVal" style={{ fontWeight: 800 }}>
                  ₹ {(selectedProduct.availableStock * (selectedProduct.rate || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <h4 className="drawerSectionTitle" style={{ marginTop: "20px" }}>Stock Movement Summary</h4>
            <div className="drawerKvList">
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Total Purchased (Inward):</span>
                <span className="drawerKvVal" style={{ color: "var(--brand-600)" }}>
                  +{selectedProduct.totalPurchased || selectedProduct.availableStock} {selectedProduct.unit}
                </span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Dispatched to Sites:</span>
                <span className="drawerKvVal" style={{ color: "var(--orange-text)" }}>
                  -{selectedProduct.totalIssued || 0} {selectedProduct.unit}
                </span>
              </div>
              <div className="drawerKvRow">
                <span className="drawerKvLabel">Consumed at Sites:</span>
                <span className="drawerKvVal" style={{ color: "var(--green-text)" }}>
                  {selectedProduct.totalConsumed || 0} {selectedProduct.unit}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Add Product Modal - Single Column Responsive Layout */}
      {isModalOpen && (
        <div className="modalBackdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Add Material to Product Master</h3>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Product Code *
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Material Description *
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Category *
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="invSelect"
                    style={{ width: "100%" }}
                  >
                    {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Unit of Measure *
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Standard Rate (₹)
                  <input
                    type="number"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Warehouse Storage Location
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Status
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="invSelect"
                    style={{ width: "100%" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modalFooter" style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
