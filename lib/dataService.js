"use client";

import { fields } from "@/data/fields";
import { DEFAULT_SUPPLIERS } from "@/data/defaultSuppliers";
import { triggerAutoSyncToGoogleSheets } from "@/google_sheets_sync/syncClient";

// Local Storage Keys
export const STORAGE_KEYS = {
  SUPPLIERS: "pdv_app_suppliers",
  PRODUCTS: "pdv_app_products",
  PURCHASES: "pdv_app_purchases",
  ISSUES: "pdv_app_issue",
  CONSUMPTIONS: "pdv_app_consumption",
  BILLS: "pdv_app_bills",
  NEEDED: "pdv_app_material_needed",
  PAYMENTS: "pdv_app_party_payments",
  RETURNS: "pdv_app_returns",
};

// Safe LocalStorage Reader
export function getStorageData(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`[DataService] Error reading ${key}:`, err);
    return fallback;
  }
}

// Safe LocalStorage Writer
export function setStorageData(key, data, autoSync = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (autoSync) {
      triggerAutoSyncToGoogleSheets();
    }
  } catch (err) {
    console.error(`[DataService] Error saving ${key}:`, err);
  }
}

/**
 * Infer category and unit for materials from master catalog
 */
export function categorizeMaterial(name = "") {
  const n = String(name).toLowerCase();
  if (
    n.includes("pipe") ||
    n.includes("nipple") ||
    n.includes("coupler") ||
    n.includes("tee") ||
    n.includes("elbow") ||
    n.includes("reducer") ||
    n.includes("socket") ||
    n.includes("bushing") ||
    n.includes("union") ||
    n.includes("end cap") ||
    n.includes("end cape") ||
    n.includes("dead plug") ||
    n.includes("anaconda") ||
    n.includes("transition") ||
    n.includes("mdpe")
  ) {
    return "Pipes & Fittings";
  }
  if (
    n.includes("valve") ||
    n.includes("gauge") ||
    n.includes("guage") ||
    n.includes("meter") ||
    n.includes("regulator")
  ) {
    return "Valves & Meters";
  }
  if (
    n.includes("drill") ||
    n.includes("hammer") ||
    n.includes("cutter") ||
    n.includes("wrench") ||
    n.includes("machine") ||
    n.includes("excuzer") ||
    n.includes("scrapper") ||
    n.includes("vice") ||
    n.includes("handel") ||
    n.includes("collet") ||
    n.includes("gutka") ||
    n.includes("board") ||
    n.includes("marker") ||
    n.includes("allenkeys") ||
    n.includes("pump") ||
    n.includes("bit")
  ) {
    return "Tools & Equipment";
  }
  if (
    n.includes("safety") ||
    n.includes("jacket") ||
    n.includes("helmet") ||
    n.includes("boot") ||
    n.includes("shooes") ||
    n.includes("shoes") ||
    n.includes("first aid") ||
    n.includes("extinguisher") ||
    n.includes("caution") ||
    n.includes("cone")
  ) {
    return "Safety & PPE";
  }
  if (
    n.includes("clamp") ||
    n.includes("screw") ||
    n.includes("gitti") ||
    n.includes("topi") ||
    n.includes("tape")
  ) {
    return "Fasteners & Hardware";
  }
  return "General Materials";
}

export function inferUnit(name = "") {
  const n = String(name).toLowerCase();
  if (n.includes("(mtr)") || n.includes(" mtr")) return "Mtr";
  if (n.includes("(pair)") || n.includes("pair")) return "Pair";
  if (n.includes(" kg") || n.includes("kg")) return "Kg";
  if (n.includes("role") || n.includes("roll")) return "Roll";
  if (n.includes("no") || n.includes("8 no") || n.includes("nos")) return "Nos";
  return "Pcs";
}

/**
 * Standard Master Materials Catalog (93 items from Excel Row 1)
 */
export function getMasterMaterialCatalog() {
  const rawList = fields.products || fields.issue?.slice(5) || [];
  return rawList.map((name, idx) => ({
    code: `MAT-${String(idx + 1).padStart(3, "0")}`,
    name,
    category: categorizeMaterial(name),
    unit: inferUnit(name),
    reorderLevel: 20,
    defaultLocation: "Central Warehouse",
    defaultRate: 150,
  }));
}

/**
 * Calculate dynamic live inventory stock across all products
 */
export function calculateLiveInventory() {
  const customProducts = getStorageData(STORAGE_KEYS.PRODUCTS, []);
  const purchases = getStorageData(STORAGE_KEYS.PURCHASES, []);
  const issues = getStorageData(STORAGE_KEYS.ISSUES, []);
  const consumptions = getStorageData(STORAGE_KEYS.CONSUMPTIONS, []);
  const returns = getStorageData(STORAGE_KEYS.RETURNS, []);
  const masterList = getMasterMaterialCatalog();

  const inventoryMap = new Map();

  // 1. Seed with Master catalog (deterministic initial opening stock)
  masterList.forEach((item, idx) => {
    // Deterministic stock baseline for realistic operational state
    const baseOpening = idx % 7 === 0 ? 15 : idx % 5 === 0 ? 0 : 50 + ((idx * 17) % 350);
    inventoryMap.set(item.name.toLowerCase().trim(), {
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      location: item.defaultLocation,
      rate: item.defaultRate,
      openingStock: baseOpening,
      totalPurchased: 0,
      totalIssued: 0,
      totalConsumed: 0,
      totalReturned: 0,
      recentPurchases: [],
      recentIssues: [],
      recentConsumptions: [],
    });
  });

  // 2. Add or update with Custom Products added in Product Master
  customProducts.forEach((p, idx) => {
    const name = Array.isArray(p) ? p[1] || p[0] : p.name || p.materialDescription;
    if (!name) return;
    const key = name.toLowerCase().trim();
    const existing = inventoryMap.get(key) || {
      code: Array.isArray(p) ? p[0] : p.code || `PRD-${String(idx + 1).padStart(3, "0")}`,
      name,
      category: (Array.isArray(p) ? p[3] : p.category) || categorizeMaterial(name),
      unit: (Array.isArray(p) ? p[4] : p.unit) || inferUnit(name),
      reorderLevel: Number(Array.isArray(p) ? p[10] : p.reorderLevel) || 20,
      location: (Array.isArray(p) ? p[11] : p.location) || "Central Warehouse",
      rate: Number(Array.isArray(p) ? p[6] : p.rate) || 120,
      openingStock: 0,
      totalPurchased: 0,
      totalIssued: 0,
      totalConsumed: 0,
      totalReturned: 0,
      recentPurchases: [],
      recentIssues: [],
      recentConsumptions: [],
    };

    if (Array.isArray(p)) {
      if (p[0]) existing.code = p[0];
      if (p[3]) existing.category = p[3];
      if (p[4]) existing.unit = p[4];
      if (p[6]) existing.rate = Number(p[6]) || existing.rate;
      if (p[10]) existing.reorderLevel = Number(p[10]) || existing.reorderLevel;
      if (p[11]) existing.location = p[11];
      if (p[5]) existing.supplier = p[5];
    } else {
      Object.assign(existing, p);
    }
    inventoryMap.set(key, existing);
  });

  // 3. Process Purchases (Inward)
  purchases.forEach((po) => {
    if (po.lineItems && Array.isArray(po.lineItems)) {
      po.lineItems.forEach((item) => {
        const key = (item.materialName || item.name || "").toLowerCase().trim();
        const rec = inventoryMap.get(key);
        const qty = Number(item.quantity || item.qty) || 0;
        if (rec) {
          rec.totalPurchased += qty;
          rec.recentPurchases.push({
            poNumber: po.piNumber || po.number || po[0],
            date: po.piDate || po.date || po[1],
            supplier: po.supplier || po[2],
            quantity: qty,
            rate: item.rate || rec.rate,
          });
        }
      });
    }
  });

  // 4. Process Material Issues (Outward to Site)
  issues.forEach((iss) => {
    if (iss.items && Array.isArray(iss.items)) {
      iss.items.forEach((item) => {
        const key = (item.name || item.materialName || "").toLowerCase().trim();
        const rec = inventoryMap.get(key);
        const qty = Number(item.qty || item.quantity) || 0;
        if (rec) {
          rec.totalIssued += qty;
          rec.recentIssues.push({
            voucherNo: iss.number || iss.challanNo,
            date: iss.date,
            department: iss.department || iss.issuedTo,
            quantity: qty,
          });
        }
      });
    }
  });

  // 5. Process Consumptions (Tracked at site)
  consumptions.forEach((c) => {
    if (c.items && Array.isArray(c.items)) {
      c.items.forEach((item) => {
        const key = (item.name || item.materialName || "").toLowerCase().trim();
        const rec = inventoryMap.get(key);
        const qty = Number(item.qty || item.quantityUsed || item.qtyUsed) || 0;
        if (rec) {
          rec.totalConsumed += qty;
          rec.recentConsumptions.push({
            consumptionNo: c.number,
            date: c.date,
            department: c.department || c.site,
            quantity: qty,
            usedBy: item.usedBy || c.usedBy,
          });
        }
      });
    } else if (c.materialName) {
      const key = c.materialName.toLowerCase().trim();
      const rec = inventoryMap.get(key);
      const qty = Number(c.quantityUsed) || 0;
      if (rec) {
        rec.totalConsumed += qty;
        rec.recentConsumptions.push({
          consumptionNo: c.number,
          date: c.date,
          department: c.department,
          quantity: qty,
          usedBy: c.usedBy,
        });
      }
    }
  });

  // 6. Process Returns (Inward from site)
  returns.forEach((ret) => {
    const key = (ret.materialName || "").toLowerCase().trim();
    const rec = inventoryMap.get(key);
    const qty = Number(ret.quantity) || 0;
    if (rec) {
      rec.totalReturned += qty;
    }
  });

  // 7. Calculate Available Stock & Status for each item
  return Array.from(inventoryMap.values()).map((item) => {
    const baseStock = item.openingStock || 0;
    const available = baseStock + item.totalPurchased - item.totalIssued + item.totalReturned;

    let status = "Good";
    if (available <= 0) {
      status = "Critical";
    } else if (available <= item.reorderLevel) {
      status = "Low";
    }

    const totalValue = available > 0 ? available * (item.rate || 0) : 0;

    return {
      ...item,
      availableStock: available,
      stockValue: totalValue,
      status,
    };
  });
}

/**
 * Get aggregated dashboard statistics
 */
export function getDashboardMetrics() {
  const inventory = calculateLiveInventory();
  const purchases = getStorageData(STORAGE_KEYS.PURCHASES, []);
  const issues = getStorageData(STORAGE_KEYS.ISSUES, []);
  const consumptions = getStorageData(STORAGE_KEYS.CONSUMPTIONS, []);
  const needed = getStorageData(STORAGE_KEYS.NEEDED, []);
  const payments = getStorageData(STORAGE_KEYS.PAYMENTS, []);

  const totalStockValue = inventory.reduce((sum, item) => sum + (item.stockValue || 0), 0);
  const lowStockItems = inventory.filter((item) => item.status === "Low" || item.status === "Critical");
  const pendingRequests = needed.filter(
    (n) => (n.status || "Requested").toLowerCase() !== "issued" && (n.status || "").toLowerCase() !== "completed"
  );

  const totalBilled = payments.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalReceived = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalReceived);

  const totalPurchasedUnits = inventory.reduce((sum, i) => sum + i.totalPurchased, 0);
  const totalIssuedUnits = inventory.reduce((sum, i) => sum + i.totalIssued, 0);
  const totalConsumedUnits = inventory.reduce((sum, i) => sum + i.totalConsumed, 0);
  const remainingSiteUnits = Math.max(0, totalIssuedUnits - totalConsumedUnits);

  const activity = [];

  purchases.forEach((po) => {
    activity.push({
      type: "purchase",
      icon: "▣",
      title: `Purchase ${po.piNumber || po[0] || "PO"}`,
      subtitle: `${po.supplier || po[2] || "Supplier"} · ${po.itemsCount || (po.lineItems ? po.lineItems.length : 1)} items`,
      date: po.piDate || po[1] || "Recent",
      timestamp: new Date(po.piDate || Date.now()).getTime() || Date.now(),
      badge: "Inward",
      badgeType: "approved",
    });
  });

  issues.forEach((iss) => {
    activity.push({
      type: "issue",
      icon: "↗",
      title: `Material Issued ${iss.number || iss.challanNo}`,
      subtitle: `To ${iss.department || iss.issuedTo} · ${iss.itemsCount || (iss.items ? iss.items.length : 1)} items`,
      date: iss.date || "Recent",
      timestamp: new Date(iss.date || Date.now()).getTime() || Date.now(),
      badge: "Dispatched",
      badgeType: "issued",
    });
  });

  consumptions.forEach((c) => {
    activity.push({
      type: "consumption",
      icon: "◔",
      title: `Consumption Recorded ${c.number}`,
      subtitle: `At ${c.department || c.site} · ${c.itemsCount || 1} items`,
      date: c.date || "Recent",
      timestamp: new Date(c.date || Date.now()).getTime() || Date.now(),
      badge: "Consumed",
      badgeType: "completed",
    });
  });

  needed.forEach((req) => {
    activity.push({
      type: "request",
      icon: "📋",
      title: `Material Requisition ${req.materialName}`,
      subtitle: `${req.partyName} · ${req.quantityNeeded} ${req.unit || "Pcs"} (${req.priority || "Normal"})`,
      date: req.requiredByDate || "Pending",
      timestamp: Date.now() - 5000,
      badge: req.priority || "High",
      badgeType: req.priority === "Urgent" ? "danger" : "pending",
    });
  });

  activity.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    totalStockValue,
    totalMaterialsCount: inventory.length,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 6),
    pendingRequestsCount: pendingRequests.length,
    pendingRequests: pendingRequests.slice(0, 5),
    totalBilled,
    totalReceived,
    totalOutstanding,
    totalPurchasesCount: purchases.length,
    pendingPurchasesCount: purchases.filter((p) => {
      const stat = (p.status || (Array.isArray(p) ? p[6] : "")).toLowerCase();
      return stat === "pending" || stat === "partial";
    }).length,
    movement: {
      purchased: totalPurchasedUnits,
      issued: totalIssuedUnits,
      consumed: totalConsumedUnits,
      remainingAtSite: remainingSiteUnits,
    },
    recentActivity: activity.slice(0, 8),
  };
}

/**
 * Universal Global Omnisearch across all entities
 */
export function searchAllEntities(query = "") {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = [];
  const inventory = calculateLiveInventory();
  const suppliers = getStorageData(STORAGE_KEYS.SUPPLIERS, []);
  const purchases = getStorageData(STORAGE_KEYS.PURCHASES, []);
  const issues = getStorageData(STORAGE_KEYS.ISSUES, []);
  const consumptions = getStorageData(STORAGE_KEYS.CONSUMPTIONS, []);
  const bills = getStorageData(STORAGE_KEYS.BILLS, []);
  const needed = getStorageData(STORAGE_KEYS.NEEDED, []);

  // 1. Products / Inventory Match
  inventory.forEach((item) => {
    if (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ) {
      results.push({
        id: `prod-${item.code}`,
        type: "Product / Stock",
        title: item.name,
        subtitle: `${item.availableStock} ${item.unit} available · ${item.category}`,
        badge: item.status,
        badgeType: item.status === "Good" ? "active" : item.status === "Low" ? "pending" : "danger",
        href: `/inventory?highlight=${encodeURIComponent(item.name)}`,
        data: item,
      });
    }
  });

  // 2. Suppliers Match
  suppliers.forEach((sup, idx) => {
    const name = Array.isArray(sup) ? sup[1] : sup.name;
    const code = Array.isArray(sup) ? sup[0] : sup.code || `SUP-${idx + 1}`;
    const contact = Array.isArray(sup) ? sup[2] : sup.contactPerson;
    if (
      (name && name.toLowerCase().includes(q)) ||
      (code && code.toLowerCase().includes(q)) ||
      (contact && contact.toLowerCase().includes(q))
    ) {
      results.push({
        id: `sup-${code}`,
        type: "Supplier",
        title: name || "Supplier",
        subtitle: `${code} · Contact: ${contact || "—"}`,
        badge: "Supplier",
        badgeType: "approved",
        href: `/suppliers?search=${encodeURIComponent(name || "")}`,
        data: sup,
      });
    }
  });

  // 3. Purchases Match
  purchases.forEach((po, idx) => {
    const no = po.piNumber || (Array.isArray(po) ? po[0] : `PO-${idx + 1}`);
    const sup = po.supplier || (Array.isArray(po) ? po[2] : "");
    if (
      (no && String(no).toLowerCase().includes(q)) ||
      (sup && String(sup).toLowerCase().includes(q))
    ) {
      results.push({
        id: `po-${no}`,
        type: "Purchase Order",
        title: `Purchase ${no}`,
        subtitle: `Supplier: ${sup || "—"} · Date: ${po.piDate || po[1] || "—"}`,
        badge: po.status || "Approved",
        badgeType: "approved",
        href: `/purchases?search=${encodeURIComponent(no)}`,
        data: po,
      });
    }
  });

  // 4. Material Issues Match
  issues.forEach((iss) => {
    const no = iss.number || iss.challanNo;
    const dept = iss.department || iss.issuedTo;
    if (
      (no && String(no).toLowerCase().includes(q)) ||
      (dept && String(dept).toLowerCase().includes(q))
    ) {
      results.push({
        id: `iss-${no}`,
        type: "Material Issue Voucher",
        title: `Voucher ${no}`,
        subtitle: `Issued to: ${dept || "Site"} · Date: ${iss.date || "—"}`,
        badge: iss.status || "Issued",
        badgeType: "issued",
        href: `/material-issue?voucher=${encodeURIComponent(no)}`,
        data: iss,
      });
    }
  });

  // 5. Consumptions Match
  consumptions.forEach((c) => {
    const no = c.number;
    const dept = c.department || c.site;
    if (
      (no && String(no).toLowerCase().includes(q)) ||
      (dept && String(dept).toLowerCase().includes(q))
    ) {
      results.push({
        id: `con-${no}`,
        type: "Consumption Record",
        title: `Consumption ${no}`,
        subtitle: `Site: ${dept || "—"} · Date: ${c.date || "—"}`,
        badge: "Consumed",
        badgeType: "completed",
        href: `/material-consumption?search=${encodeURIComponent(no)}`,
        data: c,
      });
    }
  });

  // 6. Documents Match
  bills.forEach((b) => {
    const num = b.billNumber || "";
    const sup = b.supplierName || "";
    const file = b.fileName || "";
    if (
      num.toLowerCase().includes(q) ||
      sup.toLowerCase().includes(q) ||
      file.toLowerCase().includes(q)
    ) {
      results.push({
        id: `bill-${b.id || num}`,
        type: "Document / Invoice",
        title: `${b.billType}: ${num}`,
        subtitle: `${sup} · ${b.amount || "—"} · ${file}`,
        badge: b.billType,
        badgeType: "paid",
        href: `/upload?search=${encodeURIComponent(num)}`,
        data: b,
      });
    }
  });

  return results.slice(0, 15);
}

// Default Suppliers Seed Data (re-exported from shared defaultSuppliers.js)
export { DEFAULT_SUPPLIERS };

/**
 * Format number or numeric string to INR currency representation
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹ ${num.toLocaleString()}`;
}

/**
 * Get current date string in YYYY-MM-DD format
 */
export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

/**
 * 📦 Clean Database Snapshot Generator for Google Sheets & Cloud Sync
 * Normalizes all 10 modules so that no nested objects or misaligned columns reach Google Sheets.
 */
export function getDatabaseSnapshot() {
  const inventory = calculateLiveInventory();
  const rawSuppliers = getStorageData(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  const rawProducts = getStorageData(STORAGE_KEYS.PRODUCTS, []);
  const rawPurchases = getStorageData(STORAGE_KEYS.PURCHASES, []);
  const rawIssues = getStorageData(STORAGE_KEYS.ISSUES, []);
  const rawConsumptions = getStorageData(STORAGE_KEYS.CONSUMPTIONS, []);
  const rawNeeded = getStorageData(STORAGE_KEYS.NEEDED, []);
  const rawPayments = getStorageData(STORAGE_KEYS.PAYMENTS, []);
  const rawReturns = getStorageData(STORAGE_KEYS.RETURNS, []);
  const rawBills = getStorageData(STORAGE_KEYS.BILLS, []);

  // 1. Live Inventory Summary
  const inventoryRows = inventory.map((i) => [
    i.code || "",
    i.name || "",
    i.category || "General",
    Number(i.availableStock || 0),
    i.unit || "Pcs",
    Number(i.reorderLevel || 20),
    Number(i.rate || 0),
    Number(i.stockValue || 0),
    Number(i.openingStock || 0),
    Number(i.totalPurchased || 0),
    Number(i.totalIssued || 0),
    Number(i.totalConsumed || 0),
    Number(i.totalReturned || 0),
    i.status || "Good",
    i.location || "Central Warehouse",
  ]);

  // 2. Suppliers
  const supplierRows = rawSuppliers.map((s, idx) => {
    if (Array.isArray(s)) {
      return [
        s[0] || `SUP-${String(idx + 1).padStart(3, "0")}`,
        s[1] || "",
        s[2] || "",
        s[3] || "",
        s[4] || "",
        s[5] || "",
        s[6] || "Active",
      ];
    }
    return [
      s.code || `SUP-${String(idx + 1).padStart(3, "0")}`,
      s.name || "",
      s.contactPerson || s.contact || "",
      s.mobile || "",
      s.email || "",
      s.gst || "",
      s.status || "Active",
    ];
  });

  // 3. Purchases
  const purchaseRows = rawPurchases.map((p, idx) => {
    if (Array.isArray(p)) {
      return [
        p[0] || `PO-${idx + 1}`,
        p[1] || "",
        p[2] || "",
        p[3] || "—",
        Number(p[4]) || 1,
        p[5] || "—",
        p[6] || "Approved",
        p[7] || "Pending",
        p[8] || "Central Warehouse",
        p[9] || "",
      ];
    }
    return [
      p.piNumber || p.number || `PO-${idx + 1}`,
      p.piDate || p.date || "",
      p.supplier || "",
      p.quotationNumber || "—",
      Number(p.itemsCount || (p.lineItems ? p.lineItems.length : 1)),
      p.totalAmount || "₹ 0",
      p.status || "Approved",
      p.deliveryStatus || "Pending",
      p.location || "Central Warehouse",
      p.remarks || "",
    ];
  });

  // 4. Material Issues
  const issueRows = rawIssues.map((iss, idx) => {
    if (Array.isArray(iss)) {
      return [
        iss[0] || `MIV-${idx + 1}`,
        iss[1] || "",
        iss[2] || "",
        iss[3] || "Central Warehouse",
        Number(iss[4]) || 1,
        iss[5] || "Issued",
        "",
      ];
    }
    const matSummary = iss.items && Array.isArray(iss.items)
      ? iss.items.map((m) => `${m.name} (${m.quantity} ${m.unit || "Pcs"})`).join(", ")
      : "";
    return [
      iss.number || iss.challanNo || `MIV-${idx + 1}`,
      iss.date || "",
      iss.department || iss.issuedTo || iss.party || "Site",
      iss.site || "Central Warehouse",
      Number(iss.itemsCount || (iss.items ? iss.items.length : 1)),
      iss.status || "Issued",
      matSummary,
    ];
  });

  // 5. Material Consumption
  const consumptionRows = rawConsumptions.map((c, idx) => {
    if (Array.isArray(c)) {
      return [
        c[0] || `CON-${idx + 1}`,
        c[1] || "",
        c[2] || "",
        c[3] || "",
        c[4] || "—",
        c[5] || "—",
        Number(c[6]) || 1,
        c[7] || "",
        c[8] || "Consumed",
        "",
      ];
    }
    const itemSummary = c.items && Array.isArray(c.items)
      ? c.items.map((m) => `${m.name} (${m.quantityUsed || m.qty || 0} ${m.unit || "Pcs"})`).join(", ")
      : (c.materialName ? `${c.materialName} (${c.quantityUsed || 0} Pcs)` : "");
    return [
      c.number || `CON-${idx + 1}`,
      c.date || "",
      c.department || c.site || "Site",
      c.site || "",
      c.issueVoucher || "—",
      c.usedBy || "—",
      Number(c.itemsCount || (c.items ? c.items.length : 1)),
      c.remarks || "",
      c.status || "Consumed",
      itemSummary,
    ];
  });

  // 6. Returns & Movements
  const returnRows = rawReturns.map((ret, idx) => {
    if (Array.isArray(ret)) {
      return [
        ret[0] || `RET-${idx + 1}`,
        ret[1] || "",
        ret[2] || "Return to Warehouse",
        ret[3] || "Site",
        ret[4] || "Central Warehouse",
        ret[5] || "",
        Number(ret[6]) || 0,
        ret[7] || "Pcs",
        ret[8] || "",
      ];
    }
    return [
      ret.returnNo || `RET-${idx + 1}`,
      ret.date || "",
      ret.movementType || "Return to Warehouse",
      ret.sourceSite || "Site",
      ret.destinationSite || "Central Warehouse",
      ret.materialName || "",
      Number(ret.quantity) || 0,
      ret.unit || "Pcs",
      ret.reason || "",
    ];
  });

  // 7. Material Requests (Needed)
  const neededRows = rawNeeded.map((n) => [
    n.partyName || n.party || "",
    n.materialName || n.material || "",
    Number(n.quantityNeeded || n.qty || 0),
    n.unit || "Pcs",
    n.requiredByDate || n.date || "",
    n.priority || "High",
    n.status || "Requested",
    n.remarks || "",
  ]);

  // 8. Party Payments & Ledger
  const paymentRows = rawPayments.map((p, idx) => [
    p.partyName || "",
    p.invoiceNo || `INV-${idx + 1}`,
    p.invoiceDate || "",
    Number(p.totalAmount || 0),
    Number(p.amountPaid || 0),
    Number(p.balanceLeft || 0),
    p.paymentMode || "Bank Transfer",
    p.paymentDate || "",
    p.status || "Pending",
  ]);

  // 9. Attached Bills & Documents
  const billRows = rawBills.map((b, idx) => [
    b.billType || "Invoice",
    b.billNumber || `BILL-${idx + 1}`,
    b.supplierName || "—",
    b.billDate || "",
    b.amount || "—",
    b.fileName || "",
    b.fileSize || "",
    b.status || "Verified",
  ]);

  // 10. Master Materials Catalog + Custom
  const masterCatalog = getMasterMaterialCatalog();
  const productRows = masterCatalog.map((m) => [
    m.code,
    m.name,
    m.category,
    m.unit,
    m.reorderLevel,
    m.defaultLocation,
    m.defaultRate,
    "Active",
  ]);
  rawProducts.forEach((p, idx) => {
    if (Array.isArray(p)) {
      productRows.push([
        p[0] || `PRD-${idx + 100}`,
        p[1] || "",
        p[3] || "General",
        p[4] || "Pcs",
        Number(p[10]) || 20,
        p[11] || "Central Warehouse",
        Number(p[6]) || 150,
        p[13] || "Active",
      ]);
    } else if (p.name) {
      productRows.push([
        p.code || `PRD-${idx + 100}`,
        p.name,
        p.category || "General",
        p.unit || "Pcs",
        Number(p.reorderLevel) || 20,
        p.location || "Central Warehouse",
        Number(p.rate) || 150,
        p.status || "Active",
      ]);
    }
  });

  return {
    Inventory_Stock: {
      headers: [
        "Material Code",
        "Material Name",
        "Category",
        "Available Stock",
        "Unit",
        "Reorder Level",
        "Unit Rate (₹)",
        "Stock Valuation (₹)",
        "Opening Stock",
        "Total Inward (Purchases)",
        "Total Outward (Issues)",
        "Total Consumed (Site)",
        "Total Returned",
        "Stock Status",
        "Warehouse Location",
      ],
      rows: inventoryRows,
    },
    Purchases: {
      headers: [
        "PI / PO Number",
        "Invoice Date",
        "Supplier / Vendor",
        "Quotation Ref #",
        "Items Count",
        "Total Amount",
        "Status",
        "Delivery Status",
        "Delivery Location",
        "Remarks",
      ],
      rows: purchaseRows,
    },
    Material_Issues: {
      headers: [
        "Challan / Sl No",
        "Date",
        "Party / Department",
        "Site Location",
        "Items Count",
        "Status",
        "Materials Summary",
      ],
      rows: issueRows,
    },
    Material_Consumption: {
      headers: [
        "Consumption No",
        "Date",
        "Department / Contractor",
        "Site Location",
        "Issue Voucher Ref",
        "Supervised / Used By",
        "Items Count",
        "Remarks",
        "Status",
        "Consumed Materials",
      ],
      rows: consumptionRows,
    },
    Material_Returns: {
      headers: [
        "Return #",
        "Date",
        "Movement Type",
        "Source Site",
        "Destination Site",
        "Material Name",
        "Quantity",
        "Unit",
        "Reason / Remarks",
      ],
      rows: returnRows,
    },
    Material_Needed: {
      headers: [
        "Party / Site",
        "Material Required",
        "Quantity Needed",
        "Unit",
        "Required Date",
        "Priority",
        "Status",
        "Remarks",
      ],
      rows: neededRows,
    },
    Party_Payments: {
      headers: [
        "Party / Vendor",
        "Invoice #",
        "Invoice Date",
        "Total Billed (₹)",
        "Amount Paid (₹)",
        "Balance Due (₹)",
        "Payment Mode",
        "Payment Date",
        "Status",
      ],
      rows: paymentRows,
    },
    Suppliers: {
      headers: [
        "Supplier Code",
        "Supplier Name",
        "Contact Person",
        "Mobile Number",
        "Email",
        "GSTIN",
        "Status",
      ],
      rows: supplierRows,
    },
    Products_Master: {
      headers: [
        "Product Code",
        "Material Description",
        "Category",
        "Unit",
        "Reorder Level",
        "Default Location",
        "Standard Rate (₹)",
        "Status",
      ],
      rows: productRows,
    },
    Bills: {
      headers: [
        "Document Type",
        "Invoice / Bill #",
        "Supplier / Vendor",
        "Date",
        "Amount",
        "File Name",
        "File Size",
        "Status",
      ],
      rows: billRows,
    },
  };
}

