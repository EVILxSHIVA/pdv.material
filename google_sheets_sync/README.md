# 📊 PDV Material Management: Google Apps Script Multi-Supplier Automation & Sync Engine

Enterprise-grade Google Apps Script architecture connecting **PDV Material Management** to both an **Admin Master Google Sheet** (consolidated) and **Unlimited Dedicated Supplier Google Sheets** with real-time in-place upserting, duplicate prevention, and data isolation.

---

## 🏗 High-Level Architecture

```text
               PDV MATERIAL MANAGEMENT APP
                            │
               ┌────────────┴────────────┐
               │                         │
         Admin Console             Supplier Portal
       (/reports & sync)         (/supplier dashboard)
               │                         │
               │ [Role: ADMIN]           │ [Role: SUPPLIER]
               │ [Master Datasets]       │ [Supplier-Scoped Records]
               └────────────┬────────────┘
                            │
                            ↓
                    /api/sync-sheets
                            │
                            ↓
               GOOGLE APPS SCRIPT WEBHOOK
               (LockService, Auth & Router)
                            │
              ┌─────────────┴─────────────┐
              │                           │
       Master Resolver             Supplier Resolver
              │                           │
              ↓                           ↓
      ADMIN MASTER SHEET           SUPPLIER SHEET
   (All Suppliers Consolidated)  (Isolated: SUP-001, SUP-002...)
              │                           │
              └─────────────┬─────────────┘
                            │
                     GENERIC ENGINE:
            ┌───────────────────────────────┐
            │ 1. Schema & Dataset Config    │
            │ 2. Batch Read & ID Index Map  │
            │ 3. In-Place Upsert (No Dupes) │
            │ 4. Human Styling & Formats    │
            │ 5. KPI Dashboard Update       │
            │ 6. Sync Log / Audit Entry     │
            └───────────────────────────────┘
```

---

## ⚡ Key Architectural Features

### 1. Zero Supplier-Specific Code
- **Never write `syncSupplierA()` or `syncSupplierB()`**.
- Adding a new supplier is 100% configuration/data-driven. You only need to register the supplier's Google Sheet URL in the App's **Reports & Sync Hub** or pass it in the payload.

### 2. High-Performance Batch Upsert Engine (No Duplicate Rows)
- Reads existing row unique keys in **one batch call** (`sheet.getRange(2, keyCol, numRows, 1).getValues()`).
- Indexes keys into an in-memory hash map.
- If a record exists (e.g. `PO-1001`, `BILL-001`, `SUP-001`), the existing row is updated in-place.
- If a record is new, it is queued and appended in a single bulk batch write.
- **Result: Zero duplicate rows, even on repeated syncs or retries.**

### 3. Strict Supplier Data Isolation Guard
- Supplier workbooks are strictly isolated.
- The sync engine validates that only purchase orders and billing documents belonging to `supplierCode` / `supplierName` are written to that supplier's sheet.
- Competitor supplier data can **never** leak into another supplier's workbook.

### 4. Human-Friendly Spreadsheet Aesthetics
- **Dark slate headers** (`#1e293b`) with bold white text.
- **Frozen header row 1** for convenient scrolling.
- **Alternating row striping** (`#f8fafc` / `#ffffff`) for high legibility.
- **Auto-formatted columns**:
  - Currency columns formatted as `₹ #,##0.00`.
  - Date columns formatted as `yyyy-mm-dd`.
  - Column widths automatically auto-fitted to cell contents.

### 5. Automated KPI Dashboard & Audit Log
- **`Dashboard` tab**: Generated automatically with live KPI metric cards (Total Records Processed, Added, Updated, Last Synchronized Timestamp).
- **`Sync_Log` tab**: Maintains an append-only audit trail logging timestamp, dataset, target supplier, records received, added, updated, failed, and duration in ms.

### 6. Safe Initialization & Non-Destructive Auto-Repair
- Missing tabs and missing headers are automatically repaired without deleting existing data.

---

## 📋 3-Minute Deployment Steps

### Step 1: Open Google Apps Script
1. Open your browser and go to [script.google.com](https://script.google.com/home) (or click **Extensions ➔ Apps Script** inside any Google Spreadsheet).
2. Create a new project named `PDV Material Flow Sync Webhook`.

### Step 2: Paste the Sync Engine Code
1. Delete any default code inside `Code.gs`.
2. Open [`google_sheets_sync/APPS_SCRIPT_CODE.js`](./APPS_SCRIPT_CODE.js), copy the entire file contents, and paste it into the editor.
3. Click the **Save** icon (💾 or `Ctrl + S`).

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button (top right) ➔ select **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and select **Web app**.
3. Configure the deployment settings:
   - **Description**: `PDV Material Flow Sync Engine v2`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(⚠️ CRITICAL: Must be "Anyone" so the app can submit data without Google login walls)*
4. Click **Deploy**.
5. Grant permissions:
   - Click **Review permissions** ➔ Choose your Google Account.
   - Click **Advanced** (small link at bottom left) ➔ Click **Go to PDV Material Flow Sync Engine (unsafe)** ➔ Click **Allow**.
6. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

> **Important**: Whenever you modify the script, create a new version: **Deploy ➔ Manage deployments ➔ Edit (pencil icon) ➔ Version: New version ➔ Deploy**.

---

## ⚙️ Connecting in the PDV Application

### 1. Admin Master Sheet
1. In the app, navigate to **Reports & Cloud Sync Hub** (`/reports`).
2. Click **⚙ Connection Settings**.
3. Enter:
   - **Google Apps Script Webhook URL**: Your deployment URL ending in `/exec`.
   - **Admin Master Spreadsheet URL**: The URL of your master Google Sheet.
4. Click **Save Settings**.
5. Click **"⚡ Sync Master Sheet (Upsert)"** to sync all 10 modules consolidated into the Master Sheet.

### 2. Supplier Sheets Registry
1. On the same **Reports & Cloud Sync Hub** page, scroll to **Multi-Supplier Sheet Automation & Registry**.
2. You will see all registered suppliers (`SUP-001`, `SUP-002`, etc.).
3. Paste each supplier's dedicated Google Spreadsheet URL into their respective row.
4. Click **"⚡ Sync"** on any supplier to sync their workspace individually, or click **"⚡ Sync All Supplier Sheets"** to batch sync all suppliers in parallel.

### 3. Supplier Self-Service Sync
1. When a supplier logs into their portal (`/supplier`), their dashboard displays their **Dedicated Google Sheet Workspace**.
2. They can click **"⚡ Sync My Workspace to Google Sheet"** to synchronize their latest purchase orders and invoices at any time, or click **"↗ Open My Google Sheet"** to view their sheet live.

---

## 🛠 Supported Datasets & Unique Identifiers

| Dataset Name | Target Sheet Tab | Unique Key Column | Description |
| :--- | :--- | :--- | :--- |
| `Purchases` | `Purchases` | `PI / PO Number` | Inward purchase orders & PI references |
| `Suppliers` | `Suppliers` | `Supplier Code` | Approved supplier directory & GSTIN |
| `Products_Master` | `Products_Master` | `Product Code` | Master catalog of materials |
| `Inventory_Stock` | `Inventory_Stock` | `Material Code` | Live stock levels & valuation |
| `Material_Issues` | `Material_Issues` | `Challan / Sl No` | Site dispatches & challans |
| `Material_Consumption` | `Material_Consumption` | `Consumption No` | Site usage records |
| `Material_Returns` | `Material_Returns` | `Return #` | Site returns & inter-site transfers |
| `Material_Needed` | `Material_Needed` | `Party / Site` | Material requisitions & demand |
| `Party_Payments` | `Party_Payments` | `Invoice #` | Billing ledger & payment history |
| `Bills` | `Bills` | `Invoice / Bill #` | Attached invoice soft copies & audit log |
