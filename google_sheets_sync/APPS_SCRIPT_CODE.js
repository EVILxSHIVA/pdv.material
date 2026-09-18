/**
 * =========================================================================
 * PDV MATERIAL MANAGEMENT: GOOGLE APPS SCRIPT SYNC & SPREADSHEET ENGINE
 * =========================================================================
 * Architecture:
 *   - Central Configuration & Schema Registry
 *   - Central Spreadsheet Resolver (Admin Master vs. Unlimited Supplier Sheets)
 *   - Generic Batch Upsert Engine (In-Place Row Updates & Duplicate Prevention)
 *   - Supplier Data Isolation Guard (Prevents cross-supplier data leakage)
 *   - Human-Friendly Formatter (Dark slate headers, auto-resize, zebra striping, currency/date)
 *   - Automated KPI Dashboard Generator
 *   - Central Sync Log & Audit Trail (Sync_Log tab)
 *   - Safe Structural Initialization & Auto-Repair
 * =========================================================================
 */

// Fallback configuration for standalone scripts.
// In web app deployments, destination URLs are dynamically passed in payload.
var DEFAULT_MASTER_SPREADSHEET_URL = "";

/**
 * 1. CENTRAL DATASET SCHEMA & CONFIGURATION
 * Defines sheet names, primary unique key indexes, headers, and column formats.
 */
var DATASET_CONFIG = {
  Inventory_Stock: {
    sheetName: "Inventory_Stock",
    keyColIndex: 0, // Material Code
    currencyCols: [6, 7], // Unit Rate, Stock Valuation
    dateCols: [],
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
  },
  Purchases: {
    sheetName: "Purchases",
    keyColIndex: 0, // PI / PO Number
    supplierColIndex: 2, // Supplier / Vendor name or code
    currencyCols: [5], // Total Amount
    dateCols: [1], // Invoice Date
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
  },
  Material_Issues: {
    sheetName: "Material_Issues",
    keyColIndex: 0, // Challan / Sl No
    currencyCols: [],
    dateCols: [1],
    headers: [
      "Challan / Sl No",
      "Date",
      "Party / Department",
      "Site Location",
      "Items Count",
      "Status",
      "Materials Summary",
    ],
  },
  Material_Consumption: {
    sheetName: "Material_Consumption",
    keyColIndex: 0, // Consumption No
    currencyCols: [],
    dateCols: [1],
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
  },
  Material_Returns: {
    sheetName: "Material_Returns",
    keyColIndex: 0, // Return #
    currencyCols: [],
    dateCols: [1],
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
  },
  Material_Needed: {
    sheetName: "Material_Needed",
    keyColIndex: 0, // Party / Site
    currencyCols: [],
    dateCols: [4],
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
  },
  Party_Payments: {
    sheetName: "Party_Payments",
    keyColIndex: 1, // Invoice #
    supplierColIndex: 0, // Party / Vendor
    currencyCols: [3, 4, 5], // Total Billed, Amount Paid, Balance Due
    dateCols: [2, 7], // Invoice Date, Payment Date
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
  },
  Suppliers: {
    sheetName: "Suppliers",
    keyColIndex: 0, // Supplier Code
    currencyCols: [],
    dateCols: [],
    headers: [
      "Supplier Code",
      "Supplier Name",
      "Contact Person",
      "Mobile Number",
      "Email",
      "GSTIN",
      "Status",
    ],
  },
  Products_Master: {
    sheetName: "Products_Master",
    keyColIndex: 0, // Product Code
    currencyCols: [6], // Standard Rate
    dateCols: [],
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
  },
  Bills: {
    sheetName: "Bills",
    keyColIndex: 1, // Invoice / Bill #
    supplierColIndex: 2, // Supplier / Vendor
    currencyCols: [4], // Amount
    dateCols: [3], // Date
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
  },
};

/**
 * 2. SPREADSHEET RESOLVER
 * Resolves destination workbook dynamically based on role, supplier, or payload config.
 */
function resolveSpreadsheet(payload) {
  // 1. Direct sheet URL provided in payload (highest priority for multi-supplier routing)
  if (payload && payload.sheetUrl && String(payload.sheetUrl).trim() !== "") {
    var rawUrl = String(payload.sheetUrl).trim();
    try {
      if (rawUrl.startsWith("http")) {
        return SpreadsheetApp.openByUrl(rawUrl);
      }
      return SpreadsheetApp.openById(rawUrl);
    } catch (err) {
      Logger.log("Failed to open spreadsheet by URL: " + err.message);
    }
  }

  // 2. Direct spreadsheet ID provided in payload
  if (payload && payload.spreadsheetId && String(payload.spreadsheetId).trim() !== "") {
    try {
      return SpreadsheetApp.openById(String(payload.spreadsheetId).trim());
    } catch (err) {
      Logger.log("Failed to open spreadsheet by ID: " + err.message);
    }
  }

  // 3. Fallback variable for standalone scripts
  if (DEFAULT_MASTER_SPREADSHEET_URL && DEFAULT_MASTER_SPREADSHEET_URL.trim() !== "") {
    try {
      var fallback = DEFAULT_MASTER_SPREADSHEET_URL.trim();
      return fallback.startsWith("http")
        ? SpreadsheetApp.openByUrl(fallback)
        : SpreadsheetApp.openById(fallback);
    } catch (err) {
      Logger.log("Failed to open default spreadsheet: " + err.message);
    }
  }

  // 4. Container-bound sheet fallback
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    return null;
  }
}

/**
 * 3. MAIN WEBHOOK REQUEST DISPATCHER (doPost)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 30-second lock to prevent concurrent writing collisions
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({
      result: "error",
      error: "Script lock timeout: another synchronization operation is currently in progress.",
    });
  }

  var startTime = new Date().getTime();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        result: "error",
        error: "Empty or invalid POST payload received.",
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "sync_master";
    var role = payload.role || (action === "sync_supplier" ? "SUPPLIER" : "ADMIN");

    // Resolve destination workbook
    var ss = resolveSpreadsheet(payload);
    if (!ss) {
      return createJsonResponse({
        result: "error",
        error:
          "Unable to locate target Google Spreadsheet. Please provide a valid sheetUrl or spreadsheetId.",
      });
    }

    var result = {};

    // ──────────────────────────────────────────────────────────────────────────
    // ROUTE 1: ADMIN MASTER SYNC (Consolidated All Datasets with In-Place Upsert)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "sync_master" || action === "sync_all") {
      result = handleMasterSync(ss, payload);
    }
    // ──────────────────────────────────────────────────────────────────────────
    // ROUTE 2: SUPPLIER WORKBOOK SYNC (Strictly Isolated Supplier Data)
    // ──────────────────────────────────────────────────────────────────────────
    else if (action === "sync_supplier") {
      result = handleSupplierSync(ss, payload);
    }
    // ──────────────────────────────────────────────────────────────────────────
    // ROUTE 3: GENERIC DATASET UPSERT (Single Dataset Batch)
    // ──────────────────────────────────────────────────────────────────────────
    else if (action === "upsert_batch") {
      result = handleSingleDatasetUpsert(ss, payload);
    }
    // ──────────────────────────────────────────────────────────────────────────
    // ROUTE 4: WORKBOOK INITIALIZATION & STRUCTURE REPAIR
    // ──────────────────────────────────────────────────────────────────────────
    else if (action === "initialize_sheet") {
      var isSupplier = (payload.targetType === "SUPPLIER" || role === "SUPPLIER");
      initializeWorkbook(ss, isSupplier ? "SUPPLIER" : "ADMIN", payload.supplierInfo);
      result = {
        result: "success",
        message: "Workbook initialized and formatted successfully.",
      };
    } else {
      return createJsonResponse({
        result: "error",
        error: "Unrecognized action: " + action,
      });
    }

    var durationMs = new Date().getTime() - startTime;
    result.duration = durationMs + "ms";
    result.sheetUrl = ss.getUrl();
    result.sheetName = ss.getName();

    // Log to Sync_Log sheet
    logSyncResult(ss, {
      action: action,
      target: payload.supplierCode || role || "ADMIN_MASTER",
      summary: result.summary || {},
      received: result.totalReceived || 0,
      added: result.totalAdded || 0,
      updated: result.totalUpdated || 0,
      failed: result.totalFailed || 0,
      status: result.result || "success",
      duration: durationMs + "ms",
    });

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({
      result: "error",
      error: err.toString(),
      stack: err.stack,
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 4. HEALTH CHECK / PING (doGet)
 */
function doGet(e) {
  try {
    var ss = resolveSpreadsheet({});
    return createJsonResponse({
      status: "alive",
      service: "PDV Material Management Multi-Supplier Engine",
      version: "2.0.0",
      sheetUrl: ss ? ss.getUrl() : null,
      sheetName: ss ? ss.getName() : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      error: err.toString(),
    });
  }
}

/**
 * 5. ADMIN MASTER SYNC HANDLER
 * Upserts all 10 modules into the Master workbook without duplicate rows.
 */
function handleMasterSync(ss, payload) {
  var tables = payload.tables || {};
  var tableKeys = Object.keys(tables);
  var overallSummary = {};
  var totalReceived = 0;
  var totalAdded = 0;
  var totalUpdated = 0;
  var totalFailed = 0;

  tableKeys.forEach(function (datasetKey) {
    var tableData = tables[datasetKey];
    var config = DATASET_CONFIG[datasetKey] || {
      sheetName: datasetKey,
      keyColIndex: 0,
      headers: tableData.headers || [],
      currencyCols: [],
      dateCols: [],
    };

    var records = tableData.rows || tableData.data || [];
    var syncResult = upsertDataset(ss, config, records, { mode: payload.mode || "upsert" });

    overallSummary[datasetKey] = {
      received: records.length,
      added: syncResult.added,
      updated: syncResult.updated,
      failed: syncResult.failed,
    };

    totalReceived += records.length;
    totalAdded += syncResult.added;
    totalUpdated += syncResult.updated;
    totalFailed += syncResult.failed;
  });

  // Update KPI Dashboard in Master Sheet
  try {
    updateDashboard(ss, "ADMIN", {
      totalReceived: totalReceived,
      totalAdded: totalAdded,
      totalUpdated: totalUpdated,
      tables: tables,
    });
  } catch (dashErr) {
    Logger.log("Dashboard update warning: " + dashErr.message);
  }

  cleanupDefaultSheet(ss);

  return {
    result: "success",
    message: "Admin Master Sheet synchronized successfully with duplicate prevention!",
    summary: overallSummary,
    totalReceived: totalReceived,
    totalAdded: totalAdded,
    totalUpdated: totalUpdated,
    totalFailed: totalFailed,
  };
}

/**
 * 6. SUPPLIER WORKBOOK SYNC HANDLER
 * Synchronizes supplier-specific data with strict isolation.
 */
function handleSupplierSync(ss, payload) {
  var supplierCode = payload.supplierCode;
  var supplierName = payload.supplierName || "";

  if (!supplierCode) {
    throw new Error("supplierCode is required for supplier workbook sync.");
  }

  var rawPurchases = payload.purchases || [];
  var rawBills = payload.bills || [];
  var rawProducts = payload.products || [];

  // Strict Supplier Data Isolation Guard
  var filteredPurchases = rawPurchases.filter(function (p) {
    var supp = Array.isArray(p) ? p[2] : (p.supplier || p.supplierName || "");
    return matchesSupplier(supp, supplierCode, supplierName);
  });

  var filteredBills = rawBills.filter(function (b) {
    var supp = Array.isArray(b) ? b[2] : (b.supplierName || b.supplier || "");
    return matchesSupplier(supp, supplierCode, supplierName);
  });

  // Upsert filtered datasets
  var purchaseRes = upsertDataset(ss, DATASET_CONFIG.Purchases, filteredPurchases, { mode: "upsert" });
  var billsRes = upsertDataset(ss, DATASET_CONFIG.Bills, filteredBills, { mode: "upsert" });
  var productsRes = upsertDataset(ss, DATASET_CONFIG.Products_Master, rawProducts, { mode: "upsert" });

  var totalRec = filteredPurchases.length + filteredBills.length + rawProducts.length;
  var totalAdd = purchaseRes.added + billsRes.added + productsRes.added;
  var totalUpd = purchaseRes.updated + billsRes.updated + productsRes.updated;
  var totalFail = purchaseRes.failed + billsRes.failed + productsRes.failed;

  // Update Supplier KPI Dashboard
  try {
    updateDashboard(ss, "SUPPLIER", {
      supplierCode: supplierCode,
      supplierName: supplierName,
      purchases: filteredPurchases,
      bills: filteredBills,
    });
  } catch (dErr) {
    Logger.log("Supplier dashboard warning: " + dErr.message);
  }

  cleanupDefaultSheet(ss);

  return {
    result: "success",
    message: "Supplier [" + supplierCode + "] sheet synchronized with data isolation!",
    supplierCode: supplierCode,
    summary: {
      Purchases: purchaseRes,
      Bills: billsRes,
      Products: productsRes,
    },
    totalReceived: totalRec,
    totalAdded: totalAdd,
    totalUpdated: totalUpd,
    totalFailed: totalFail,
  };
}

/**
 * 7. SINGLE DATASET BATCH HANDLER
 */
function handleSingleDatasetUpsert(ss, payload) {
  var datasetName = payload.dataset || payload.sheetName;
  var config = DATASET_CONFIG[datasetName] || {
    sheetName: datasetName,
    keyColIndex: 0,
    headers: payload.headers || [],
    currencyCols: [],
    dateCols: [],
  };

  var records = payload.records || payload.data || [];
  var res = upsertDataset(ss, config, records, { mode: payload.mode || "upsert" });

  return {
    result: "success",
    dataset: datasetName,
    summary: res,
    totalReceived: records.length,
    totalAdded: res.added,
    totalUpdated: res.updated,
    totalFailed: res.failed,
  };
}

/**
 * 8. GENERIC BATCH UPSERT ENGINE
 * Core high-performance engine that reads existing IDs in one batch call,
 * matches them in memory, and performs bulk in-place updates and bulk appends.
 * PREVENTS DUPLICATE ROWS.
 */
function upsertDataset(ss, config, records, options) {
  var sheet = getOrCreateSheet(ss, config.sheetName);
  var headers = config.headers;
  var keyColIdx = config.keyColIndex !== undefined ? config.keyColIndex : 0;
  var mode = (options && options.mode) || "upsert";

  // If sheet is empty or replace mode requested
  if (mode === "replace" || sheet.getLastRow() === 0) {
    sheet.clear();
    writeHeaders(sheet, headers);
    if (records.length === 0) {
      return { received: 0, added: 0, updated: 0, failed: 0 };
    }
    var sanitizedBatch = sanitizeRows(records, headers.length);
    var targetRange = sheet.getRange(2, 1, sanitizedBatch.length, headers.length);
    targetRange.setValues(sanitizedBatch);
    styleDataRows(sheet, 2, sanitizedBatch.length, headers.length, config);
    return {
      received: records.length,
      added: sanitizedBatch.length,
      updated: 0,
      failed: 0,
    };
  }

  // Ensure headers match schema
  ensureHeaders(sheet, headers);

  var lastRow = sheet.getLastRow();
  var sanitized = sanitizeRows(records, headers.length);
  if (sanitized.length === 0) {
    return { received: 0, added: 0, updated: 0, failed: 0 };
  }

  var keyMap = {}; // key -> 1-based row number
  if (lastRow > 1) {
    // Read all keys in one batch call (1 API call)
    var existingKeyValues = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < existingKeyValues.length; r++) {
      var rawKey = String(existingKeyValues[r][0]).trim();
      if (rawKey !== "") {
        keyMap[rawKey] = r + 2; // Row in sheet
      }
    }
  }

  var rowsToAppend = [];
  var updatedCount = 0;
  var addedCount = 0;
  var failedCount = 0;

  // In-memory segregation: Update existing vs Accumulate new
  for (var i = 0; i < sanitized.length; i++) {
    var row = sanitized[i];
    var recordKey = String(row[keyColIdx] || "").trim();

    if (!recordKey) {
      failedCount++;
      continue;
    }

    if (keyMap[recordKey]) {
      // Row exists: update existing row in-place
      var targetRowNum = keyMap[recordKey];
      sheet.getRange(targetRowNum, 1, 1, headers.length).setValues([row]);
      updatedCount++;
    } else {
      // New record: queue for batch append
      rowsToAppend.push(row);
      // Track in keyMap to prevent duplicates inside the same batch
      keyMap[recordKey] = lastRow + rowsToAppend.length;
      addedCount++;
    }
  }

  // Bulk append new rows in a single batch operation
  if (rowsToAppend.length > 0) {
    var appendStartRow = sheet.getLastRow() + 1;
    var appendRange = sheet.getRange(appendStartRow, 1, rowsToAppend.length, headers.length);
    appendRange.setValues(rowsToAppend);
    styleDataRows(sheet, appendStartRow, rowsToAppend.length, headers.length, config);
  }

  return {
    received: records.length,
    added: addedCount,
    updated: updatedCount,
    failed: failedCount,
  };
}

/**
 * 9. HUMAN-FRIENDLY STYLING & FORMATTING UTILITIES
 */
function writeHeaders(sheet, headers) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1e293b"); // Modern Slate dark
  headerRange.setFontColor("#ffffff"); // Crisp white
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setFontSize(10.5);
  sheet.setRowHeight(1, 34);
  sheet.setFrozenRows(1);
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() < 1) {
    writeHeaders(sheet, headers);
    return;
  }
  var current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0];
  var needsRepair = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(current[i] || "").trim() !== headers[i]) {
      needsRepair = true;
      break;
    }
  }
  if (needsRepair) {
    writeHeaders(sheet, headers);
  }
}

function styleDataRows(sheet, startRow, numRows, numCols, config) {
  if (numRows <= 0) return;

  var range = sheet.getRange(startRow, 1, numRows, numCols);
  range.setVerticalAlignment("middle");
  range.setFontSize(10);

  // Subtle alternating zebra striping
  for (var r = 0; r < numRows; r++) {
    var currentRow = startRow + r;
    var rowRange = sheet.getRange(currentRow, 1, 1, numCols);
    rowRange.setBackground(r % 2 === 1 ? "#f8fafc" : "#ffffff");
    sheet.setRowHeight(currentRow, 25);
  }

  // Currency column formatting
  if (config && config.currencyCols && config.currencyCols.length > 0) {
    config.currencyCols.forEach(function (colIdx) {
      if (colIdx < numCols) {
        sheet.getRange(startRow, colIdx + 1, numRows, 1).setNumberFormat("₹ #,##0.00");
      }
    });
  }

  // Date column formatting
  if (config && config.dateCols && config.dateCols.length > 0) {
    config.dateCols.forEach(function (colIdx) {
      if (colIdx < numCols) {
        sheet.getRange(startRow, colIdx + 1, numRows, 1).setNumberFormat("yyyy-mm-dd");
      }
    });
  }

  // Auto-fit columns
  try {
    sheet.autoResizeColumns(1, Math.min(numCols, 25));
  } catch (err) {}
}

/**
 * Normalizes rows so that every row has exact header length and no [object Object]
 */
function sanitizeRows(rows, targetColCount) {
  return rows.map(function (row) {
    var arr = Array.isArray(row) ? row : Object.values(row);
    var cleanRow = [];

    for (var i = 0; i < targetColCount; i++) {
      var val = arr[i];
      if (val === undefined || val === null) {
        cleanRow.push("");
      } else if (typeof val === "object") {
        if (Array.isArray(val)) {
          cleanRow.push(
            val
              .map(function (item) {
                return typeof item === "object"
                  ? (item.name || item.materialName || JSON.stringify(item))
                  : String(item);
              })
              .join(", ")
          );
        } else {
          cleanRow.push(JSON.stringify(val));
        }
      } else {
        cleanRow.push(val);
      }
    }
    return cleanRow;
  });
}

/**
 * Helper to match supplier by Code or Name
 */
function matchesSupplier(fieldValue, targetCode, targetName) {
  if (!fieldValue) return false;
  var f = String(fieldValue).toLowerCase().trim();
  var c = String(targetCode || "").toLowerCase().trim();
  var n = String(targetName || "").toLowerCase().trim();

  if (c && f.indexOf(c) !== -1) return true;
  if (n && f.indexOf(n) !== -1) return true;
  return false;
}

/**
 * 10. KPI DASHBOARD GENERATOR
 * Generates an executive summary tab with real-time KPI metrics.
 */
function updateDashboard(ss, role, stats) {
  var dashSheet = getOrCreateSheet(ss, "Dashboard");
  dashSheet.clear();

  // Dashboard Header Banner
  dashSheet.getRange("A1:F2").merge();
  var banner = dashSheet.getRange("A1");
  var title = role === "ADMIN"
    ? "PDV MATERIAL MANAGEMENT — ADMIN CONSOLIDATED MASTER DASHBOARD"
    : "PDV SUPPLIER PORTAL — " + (stats.supplierName || stats.supplierCode || "WORKSPACE");
  banner.setValue(title);
  banner.setBackground("#1e293b");
  banner.setFontColor("#ffffff");
  banner.setFontWeight("bold");
  banner.setFontSize(14);
  banner.setHorizontalAlignment("center");
  banner.setVerticalAlignment("middle");

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm:ss");

  if (role === "ADMIN") {
    var kpis = [
      ["TOTAL MODULES SYNCED", "RECORDS PROCESSED", "RECORDS INSERTED", "RECORDS UPDATED", "SYNC STATUS", "LAST SYNCHRONIZED"],
      [
        10,
        stats.totalReceived || 0,
        stats.totalAdded || 0,
        stats.totalUpdated || 0,
        "HEALTHY / LIVE",
        now,
      ],
    ];

    dashSheet.getRange("A4:F5").setValues(kpis);
    var labelRange = dashSheet.getRange("A4:F4");
    labelRange.setFontWeight("bold");
    labelRange.setBackground("#334155");
    labelRange.setFontColor("#f8fafc");
    labelRange.setHorizontalAlignment("center");
    labelRange.setFontSize(9);

    var valRange = dashSheet.getRange("A5:F5");
    valRange.setFontWeight("bold");
    valRange.setFontSize(14);
    valRange.setHorizontalAlignment("center");
    valRange.setVerticalAlignment("middle");
    valRange.setBackground("#f1f5f9");
    dashSheet.setRowHeight(5, 36);

    // Module Quick Breakdown
    dashSheet.getRange("A7:C7").merge();
    dashSheet.getRange("A7").setValue("CORE SYSTEM REGISTERS").setFontWeight("bold").setFontSize(11);

    var regHeaders = [["Module Name", "Target Tab", "Unique Identifier"]];
    var regRows = [
      ["Inventory & Stock", "Inventory_Stock", "Material Code"],
      ["Purchase Orders (PO / PI)", "Purchases", "PI / PO Number"],
      ["Material Issues & Challans", "Material_Issues", "Challan / Sl No"],
      ["Site Material Consumption", "Material_Consumption", "Consumption No"],
      ["Site Transfers & Returns", "Material_Returns", "Return #"],
      ["Requisitions & Demand", "Material_Needed", "Party / Site"],
      ["Vendor Ledger & Payments", "Party_Payments", "Invoice #"],
      ["Master Material Catalog", "Products_Master", "Product Code"],
      ["Approved Suppliers Directory", "Suppliers", "Supplier Code"],
      ["Bills & Documents Audit Vault", "Bills", "Invoice / Bill #"],
    ];

    dashSheet.getRange(8, 1, 1, 3).setValues(regHeaders).setFontWeight("bold").setBackground("#e2e8f0");
    dashSheet.getRange(9, 1, regRows.length, 3).setValues(regRows);

  } else {
    // Supplier Dashboard KPIs
    var purCount = (stats.purchases || []).length;
    var billCount = (stats.bills || []).length;

    var suppKpis = [
      ["ASSIGNED ORDERS", "SUBMITTED INVOICES", "PORTAL STATUS", "SUPPLIER CODE", "LAST UPDATED"],
      [purCount, billCount, "ACTIVE / VERIFIED", stats.supplierCode, now],
    ];

    dashSheet.getRange("A4:E5").setValues(suppKpis);
    var sLabel = dashSheet.getRange("A4:E4");
    sLabel.setFontWeight("bold");
    sLabel.setBackground("#334155");
    sLabel.setFontColor("#f8fafc");
    sLabel.setHorizontalAlignment("center");
    sLabel.setFontSize(9);

    var sVal = dashSheet.getRange("A5:E5");
    sVal.setFontWeight("bold");
    sVal.setFontSize(14);
    sVal.setHorizontalAlignment("center");
    sVal.setVerticalAlignment("middle");
    sVal.setBackground("#f1f5f9");
    dashSheet.setRowHeight(5, 36);
  }

  try {
    dashSheet.autoResizeColumns(1, 6);
  } catch (e) {}
}

/**
 * 11. CENTRAL AUDIT & SYNC LOG
 * Maintains a persistent chronological log of every sync operation.
 */
function logSyncResult(ss, entry) {
  try {
    var logSheet = getOrCreateSheet(ss, "Sync_Log");
    var logHeaders = [
      "Timestamp",
      "Action",
      "Target / Supplier",
      "Records Received",
      "Records Added",
      "Records Updated",
      "Records Failed",
      "Status",
      "Duration",
    ];

    if (logSheet.getLastRow() === 0) {
      writeHeaders(logSheet, logHeaders);
    }

    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm:ss");
    var row = [
      now,
      entry.action || "sync",
      entry.target || "ADMIN_MASTER",
      entry.received || 0,
      entry.added || 0,
      entry.updated || 0,
      entry.failed || 0,
      entry.status || "success",
      entry.duration || "0ms",
    ];

    var nextRow = logSheet.getLastRow() + 1;
    logSheet.getRange(nextRow, 1, 1, logHeaders.length).setValues([row]);
    logSheet.setRowHeight(nextRow, 24);
  } catch (logErr) {
    Logger.log("Failed to write to Sync_Log: " + logErr.message);
  }
}

/**
 * 12. SAFE WORKBOOK INITIALIZATION & AUTO-REPAIR
 * Idempotently verifies and repairs sheet tabs, headers, and dashboard.
 */
function initializeWorkbook(ss, mode, supplierInfo) {
  var isSupplier = mode === "SUPPLIER";

  var requiredDatasets = isSupplier
    ? ["Purchases", "Bills", "Products_Master"]
    : Object.keys(DATASET_CONFIG);

  requiredDatasets.forEach(function (key) {
    var config = DATASET_CONFIG[key];
    var sheet = getOrCreateSheet(ss, config.sheetName);
    ensureHeaders(sheet, config.headers);
  });

  // Ensure Sync_Log tab exists
  var logSheet = getOrCreateSheet(ss, "Sync_Log");
  if (logSheet.getLastRow() === 0) {
    writeHeaders(logSheet, [
      "Timestamp",
      "Action",
      "Target / Supplier",
      "Records Received",
      "Records Added",
      "Records Updated",
      "Records Failed",
      "Status",
      "Duration",
    ]);
  }

  // Build / update initial dashboard
  updateDashboard(ss, isSupplier ? "SUPPLIER" : "ADMIN", supplierInfo || {});
  cleanupDefaultSheet(ss);
}

/**
 * 13. SPREADSHEET HELPERS
 */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function cleanupDefaultSheet(ss) {
  var sheets = ss.getSheets();
  if (sheets.length > 1) {
    var defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (e) {}
    }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
