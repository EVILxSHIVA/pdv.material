"use client";

import { useState, useEffect, useMemo } from "react";
import Shell from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMasterMaterialCatalog, getStorageData, STORAGE_KEYS } from "@/lib/dataService";
import "../supplier.css";

export default function SupplierMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    // Load catalog items relevant to this vendor
    const master = getMasterMaterialCatalog();
    const custom = getStorageData(STORAGE_KEYS.PRODUCTS, []);

    // Filter to items matching this vendor or general hardware catalog
    const vendorName = user?.supplierName?.toLowerCase() || "";
    const vendorCode = user?.supplierCode?.toLowerCase() || "";

    const combined = [...master];
    custom.forEach((p, idx) => {
      const pSupplier = Array.isArray(p) ? p[5] : p.supplier;
      if (
        pSupplier &&
        (pSupplier.toLowerCase().includes(vendorName) ||
          vendorName.includes(pSupplier.toLowerCase()))
      ) {
        combined.unshift({
          code: Array.isArray(p) ? p[0] : p.code || `PRD-${idx + 1}`,
          name: Array.isArray(p) ? p[1] : p.name,
          category: (Array.isArray(p) ? p[3] : p.category) || "General Materials",
          unit: (Array.isArray(p) ? p[4] : p.unit) || "Pcs",
          defaultRate: Number(Array.isArray(p) ? p[6] : p.rate) || 150,
          defaultLocation: (Array.isArray(p) ? p[11] : p.location) || "Central Warehouse",
        });
      }
    });

    setMaterials(combined);
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set(materials.map((m) => m.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const cat = (m.category || "").toLowerCase();
      const s = search.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || cat.includes(s);

      const matchesCat = categoryFilter === "All" || m.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [materials, search, categoryFilter]);

  return (
    <Shell>
      <div className="sectionHeaderRow" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
            Supplied Materials & Catalog
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Standard specifications, unit measurements, and supply rates for your catalog.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <input
          type="text"
          className="textInput"
          style={{ maxWidth: "360px" }}
          placeholder="Search materials by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: "500" }}>
            Category:
          </span>
          <select
            className="textInput"
            style={{ width: "auto", padding: "0 12px", height: "38px" }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="supplierTableWrapper">
        <table className="supplierTable">
          <thead>
            <tr>
              <th>Material Description</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Standard Rate</th>
              <th>Primary Warehouse</th>
              <th>Catalog Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((item) => (
              <tr key={item.name}>
                <td>
                  <b>{item.name}</b>
                </td>
                <td>{item.category}</td>
                <td>{item.unit}</td>
                <td>₹ {item.defaultRate || 150}</td>
                <td>{item.defaultLocation}</td>
                <td>
                  <Badge status="Active" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
