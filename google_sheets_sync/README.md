# 📊 Google Sheets 1-Click Cloud Database

This folder contains everything needed to connect the **PDV Material Management App** directly to **Google Sheets** for real-time cloud backup, viewing, and live Excel generation.

---

## 🚀 How It Works (Zero Manual Table Creation Required!)

You **do NOT** need to create any sheets or column headers by hand in Google Sheets.
The script automatically detects missing tabs, creates them (`Suppliers`, `Products`, `Purchases`, `Material_Issues`, `Material_Consumption`, `Bills`), formats dark headers, and populates the data whenever you click **"Sync to Google Sheets"**.

---

## 📋 3-Minute Setup Steps

### Step 1: Open a Blank Google Sheet
1. Open your browser and go to [sheets.new](https://sheets.new) (or create a new Google Spreadsheet in your Google Drive).
2. Name the spreadsheet (e.g. `PDV Vrindavan Materials Database`).

---

### Step 2: Paste the Apps Script Code
1. In your Google Sheet top menu, click **Extensions** ➔ **Apps Script**.
2. Delete any default code inside the editor.
3. Open [`google_sheets_sync/APPS_SCRIPT_CODE.js`](./APPS_SCRIPT_CODE.js), copy the entire file contents, and paste it into the editor.
4. Click the **Save** icon (💾 or `Ctrl + S`).

---

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button (top right) ➔ select **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `PDV 1-Click Sync Webhook`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(⚠️ Critical! This allows the app to send data to the sheet)*
4. Click **Deploy**.
5. Grant permissions:
   - Click **Review permissions** ➔ Choose your Google Account.
   - Click **Advanced** (small link at bottom left) ➔ Click **Go to PDV 1-Click Sync Webhook (unsafe)** ➔ Click **Allow**.
6. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfycby.../exec`).

---

### Step 4: Paste Webhook URL into the App
You can configure the Webhook URL in either of two ways:

#### Option A: Directly from the Browser UI (Fastest)
1. Open the PDV Web App and go to the **Reports / Excel & Cloud Hub** page.
2. Under **Google Sheets Cloud Sync Hub**, click **⚙️ Configure Sheet URL**.
3. Paste your Webhook URL and your Google Sheet URL, then click **Save**.

#### Option B: In `.env.local`
Add this to your `.env.local` file:
```env
NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
NEXT_PUBLIC_GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
```

---

## ⚡ How to Sync
1. Go to **Reports & Export Hub** in your app.
2. Click **"📤 Sync All to Google Sheets in 1-Click"**.
3. All your data across all 6 modules will instantly be written to your Google Sheet!

fdmnb
