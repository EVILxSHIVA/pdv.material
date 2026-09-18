"use client";

import { fields } from "@/data/fields";
import { getDatabaseSnapshot } from "@/lib/dataService";

const STORAGE_WEBHOOK_KEY = "pdv_gsheet_webhook_url";
const STORAGE_SHEET_URL_KEY = "pdv_gsheet_spreadsheet_url";
const STORAGE_SUPPLIER_REGISTRY_KEY = "pdv_supplier_sheet_registry";

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
 * Get current Admin Master Google Sheet link
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

export function getMasterSheetUrl() {
  return getSheetUrl();
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
 * Get all Supplier Google Sheet mappings: { [supplierCode]: url }
 */
export function getSupplierSheetRegistry() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_SUPPLIER_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("[SyncClient] Error reading supplier sheet registry:", err);
    return {};
  }
}

/**
 * Get dedicated Google Sheet link for a specific supplier
 */
export function getSupplierSheetUrl(supplierCode) {
  if (!supplierCode) return "";
  const registry = getSupplierSheetRegistry();
  return registry[supplierCode] || "";
}

/**
 * Save dedicated Google Sheet link for a supplier
 */
export function saveSupplierSheetUrl(supplierCode, url) {
  if (typeof window === "undefined" || !supplierCode) return;
  try {
    const registry = getSupplierSheetRegistry();
    registry[supplierCode] = url ? url.trim() : "";
    localStorage.setItem(STORAGE_SUPPLIER_REGISTRY_KEY, JSON.stringify(registry));
  } catch (err) {
    console.error("[SyncClient] Error saving supplier sheet url:", err);
  }
}

/**
 * ⚡ Admin Master Cloud Sync: Syncs all 10 modules into the Master Sheet with duplicate prevention
 */
export async function syncMasterGoogleSheet(options = { mode: "upsert" }) {
  const webhookUrl = getWebhookUrl();
  const sheetUrl = getMasterSheetUrl();

  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured. Configure it in Reports & Sync Hub.");
  }

  // Generate standardized, clean snapshot across all 10 datasets
  const tables = getDatabaseSnapshot();

  const payload = {
    action: "sync_master",
    mode: options.mode || "upsert",
    webhookUrl,
    sheetUrl,
    role: "ADMIN",
    tables,
  };

  const response = await fetch("/api/sync-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.result === "error") {
    throw new Error(result.error || "Failed to synchronize Admin Master Sheet");
  }

  if (result.sheetUrl) {
    saveSheetConfig({ sheetUrl: result.sheetUrl });
  }

  return result;
}

/**
 * ⚡ Synchronize isolated supplier workspace to the supplier's dedicated Google Sheet
 */
export async function syncSupplierGoogleSheet(supplierCode, supplierName, options = { mode: "upsert" }) {
  const webhookUrl = getWebhookUrl();
  const sheetUrl = getSupplierSheetUrl(supplierCode);

  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured.");
  }
  if (!sheetUrl) {
    throw new Error(`No Google Sheet URL is configured for supplier [${supplierCode}].`);
  }

  // Gather client data
  const getList = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const purchases = getList("pdv_app_purchases");
  const bills = getList("pdv_app_bills");
  const products = getList("pdv_app_products");

  const payload = {
    action: "sync_supplier",
    mode: options.mode || "upsert",
    webhookUrl,
    sheetUrl,
    role: "SUPPLIER",
    supplierCode,
    supplierName,
    purchases,
    bills,
    products,
  };

  const response = await fetch("/api/sync-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.result === "error") {
    throw new Error(result.error || `Failed to sync supplier sheet for [${supplierCode}]`);
  }

  return result;
}

/**
 * ⚡ Batch sync for all configured suppliers in parallel
 */
export async function syncAllSuppliersToGoogleSheets(suppliersList = [], options = { mode: "upsert" }) {
  const registry = getSupplierSheetRegistry();
  const configuredCodes = Object.keys(registry).filter((code) => Boolean(registry[code]));

  if (configuredCodes.length === 0) {
    throw new Error("No suppliers have registered Google Sheet URLs to synchronize.");
  }

  const results = {
    totalConfigured: configuredCodes.length,
    successful: 0,
    failed: 0,
    details: {},
  };

  const promises = configuredCodes.map(async (code) => {
    const supObj = suppliersList.find((s) => {
      const sCode = Array.isArray(s) ? s[0] : s.code;
      return sCode === code;
    });
    const sName = supObj ? (Array.isArray(supObj) ? supObj[1] : supObj.name) : code;

    try {
      const res = await syncSupplierGoogleSheet(code, sName, options);
      results.successful += 1;
      results.details[code] = { status: "success", summary: res };
    } catch (err) {
      results.failed += 1;
      results.details[code] = { status: "error", error: err.message };
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * ⚡ Initialize spreadsheet structure and formatting (Admin Master or Supplier)
 */
export async function initializeSheetStructure(sheetUrl, targetType = "ADMIN", supplierInfo = null) {
  const webhookUrl = getWebhookUrl();
  const targetSheetUrl = sheetUrl || getMasterSheetUrl();

  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured.");
  }
  if (!targetSheetUrl) {
    throw new Error("No target Google Sheet URL provided for initialization.");
  }

  const payload = {
    action: "initialize_sheet",
    webhookUrl,
    sheetUrl: targetSheetUrl,
    targetType,
    supplierInfo,
  };

  const response = await fetch("/api/sync-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.result === "error") {
    throw new Error(result.error || "Failed to initialize spreadsheet structure");
  }

  return result;
}

/**
 * Debounced background auto-sync trigger
 */
let autoSyncTimer = null;
export function triggerAutoSyncToGoogleSheets() {
  if (typeof window === "undefined") return;
  if (autoSyncTimer) clearTimeout(autoSyncTimer);

  autoSyncTimer = setTimeout(() => {
    try {
      const webhook = getWebhookUrl();
      const sheet = getMasterSheetUrl();
      if (webhook && sheet) {
        syncMasterGoogleSheet({ mode: "upsert" }).catch((err) => {
          console.warn("[AutoSync] Background sync notice:", err.message);
        });
      }
    } catch (e) {
      // Background silent fallback
    }
  }, 3000);
}

/**
 * ⚡ Legacy / General 1-Click Master Cloud Sync
 */
export async function syncAllToGoogleSheets(options = { mode: "replace" }) {
  return syncMasterGoogleSheet({ mode: options.mode || "upsert" });
}

/**
 * Sync single module / table to Google Sheets
 */
export async function syncSingleToGoogleSheets({ sheetName, headers, rows, mode = "replace" }) {
  const webhookUrl = getWebhookUrl();
  const sheetUrl = getMasterSheetUrl();

  if (!webhookUrl) {
    throw new Error("Google Sheets Webhook URL is not configured.");
  }

  const payload = {
    action: "upsert_batch",
    webhookUrl,
    sheetUrl,
    sheetName,
    headers,
    data: rows,
    isBatch: true,
    mode,
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
