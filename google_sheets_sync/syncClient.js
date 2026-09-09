"use client";

import { fields } from "@/data/fields";

const STORAGE_WEBHOOK_KEY = "pdv_gsheet_webhook_url";
const STORAGE_SHEET_URL_KEY = "pdv_gsheet_spreadsheet_url";

export const DEFAULT_OFFICIAL_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxGDFQhNbMHVH9eGbQKl0cEaAC8R-dKcHJdsA6uc_O8Y1LNa32qNE82Nho3ibR6Uga4Ng/exec";

export const DEFAULT_OFFICIAL_SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/14oJVSNd3xuRloR9DZR_7zfnjvMVrwWh6nltjvqap_h0/edit";

/**
 * Get current configured Webhook URL
 */
export function getWebhookUrl() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_WEBHOOK_KEY);
    if (saved && saved.trim() !== "") return saved.trim();
  }
  return (
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL ||
    DEFAULT_OFFICIAL_WEBHOOK_URL
  );
}

/**
 * Get current Google Sheet link
 */
export function getSheetUrl() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_SHEET_URL_KEY);
    if (saved && saved.trim() !== "") return saved.trim();
  }
  return (
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL ||
    DEFAULT_OFFICIAL_SPREADSHEET_URL
  );
}

/**
 * Save configuration to localStorage
 */
export function saveSheetConfig({ webhookUrl, sheetUrl }) {
  if (typeof window !== "undefined") {
    if (webhookUrl !== undefined) localStorage.setItem(STORAGE_WEBHOOK_KEY, webhookUrl.trim());
    if (sheetUrl !== undefined) localStorage.setItem(STORAGE_SHEET_URL_KEY, sheetUrl.trim());
  }
}

/**
 * ⚡ 1-Click Master Cloud Sync: Sync all 6 modules simultaneously to Google Sheets
 */
export async function syncAllToGoogleSheets(options = { mode: "replace" }) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured. Click '⚙️ Configure Sheet URL' to set it up.");
  }

  // 1. Gather all local storage data
  const getList = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const suppliers = getList("pdv_app_suppliers");
  const products = getList("pdv_app_products");
  const purchases = getList("pdv_app_purchases");
  const issues = getList("pdv_app_issue");
  const consumptions = getList("pdv_app_consumption");
  const bills = getList("pdv_app_bills");
  const needed = getList("pdv_app_material_needed");
  const payments = getList("pdv_app_party_payments");

  // Format rows for issues
  const issueRows = issues.map((i) => [
    i.number || "",
    i.date || "",
    i.department || "",
    i.itemsCount || "",
    i.status || "Issued"
  ]);

  // Format rows for consumptions
  const consumptionRows = consumptions.map((c) => [
    c.number || "",
    c.date || "",
    c.department || "",
    c.itemsCount || "",
    c.status || "Consumed"
  ]);

  // Format rows for bills
  const billRows = bills.map((b) => [
    b.billType || "",
    b.billNumber || "",
    b.supplierName || "",
    b.billDate || "",
    b.amount || "",
    b.fileName || "",
    b.fileSize || ""
  ]);

  // Format rows for needed
  const neededRows = needed.map((n) => [
    n.partyName || "",
    n.materialName || "",
    n.quantityNeeded || "",
    n.unit || "Pcs",
    n.requiredByDate || "",
    n.priority || "High",
    n.status || "Requested",
    n.remarks || ""
  ]);

  // Format rows for payments
  const paymentRows = payments.map((p) => [
    p.partyName || "",
    p.invoiceNo || "",
    p.invoiceDate || "",
    p.totalAmount || 0,
    p.amountPaid || 0,
    p.balanceLeft || 0,
    p.paymentMode || "",
    p.paymentDate || "",
    p.status || "Pending"
  ]);

  const payload = {
    action: "sync_all",
    mode: options.mode || "replace",
    webhookUrl: webhookUrl,
    tables: {
      "Suppliers": {
        headers: fields.suppliers || ["Supplier Code", "Supplier Name", "Contact Person", "Mobile", "Email", "GST", "Address", "City", "Terms", "Bank", "Status"],
        rows: suppliers
      },
      "Products": {
        headers: ["Product Code", "Product Name", "Category", "Unit", "Description", "Supplier", "Rate", "Status"],
        rows: products
      },
      "Purchases": {
        headers: ["Invoice / Voucher No", "Invoice Date", "Supplier", "Quote No", "Items Count", "Total Amount", "Status"],
        rows: purchases
      },
      "Material_Issues": {
        headers: ["Challan / Sl No", "Date", "Issued To / Department", "Items Count", "Status"],
        rows: issueRows
      },
      "Material_Consumption": {
        headers: ["Consumption No", "Date", "Department / Site", "Items Count", "Status"],
        rows: consumptionRows
      },
      "Material_Needed": {
        headers: ["Party / Site", "Material Required", "Qty Needed", "Unit", "Required Date", "Priority", "Status", "Remarks"],
        rows: neededRows
      },
      "Party_Payments": {
        headers: ["Party / Vendor", "Invoice #", "Invoice Date", "Total Billed (₹)", "Amount Paid / Received (₹)", "Balance Due (₹)", "Payment Mode", "Payment Date", "Status"],
        rows: paymentRows
      },
      "Bills": {
        headers: ["Type", "Number", "Supplier", "Date", "Amount", "File Name", "Size"],
        rows: billRows
      }
    }
  };

  const response = await fetch("/api/sync-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.result === "error") {
    throw new Error(result.error || "Failed to sync to Google Sheets");
  }

  // If script returned sheetUrl, update it
  if (result.sheetUrl) {
    saveSheetConfig({ sheetUrl: result.sheetUrl });
  }

  return result;
}

/**
 * Sync single module to Google Sheets
 */
export async function syncSingleToGoogleSheets({ sheetName, headers, rows, mode = "replace" }) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured.");
  }

  const payload = {
    webhookUrl,
    sheetName,
    headers,
    data: rows,
    isBatch: true,
    mode
  };

  const response = await fetch("/api/sync-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.result === "error") {
    throw new Error(result.error || "Failed to sync module to Google Sheets");
  }

  return result;
}

let syncDebounceTimer = null;

/**
 * ⚡ Real-Time Auto-Sync Helper: Automatically triggers background cloud sync whenever any form updates.
 */
export function triggerAutoSyncToGoogleSheets(delayMs = 400) {
  if (typeof window === "undefined") return;

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    try {
      console.log("[Auto-Sync] Initiating real-time sync to Google Sheets...");
      await syncAllToGoogleSheets({ mode: "replace" });
      console.log("[Auto-Sync] Cloud sync completed successfully.");
    } catch (err) {
      console.warn("[Auto-Sync Error]", err.message);
    }
  }, delayMs);
}

