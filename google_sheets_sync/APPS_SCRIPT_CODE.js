/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: 1-Click Cloud Database Backend for PDV Material Flow
 * =========================================================================
 * 
 * HOW TO USE:
 * 1. Open a blank Google Spreadsheet at https://sheets.new
 * 2. Click "Extensions" -> "Apps Script" in top menu
 * 3. Delete any code in the editor, and paste this ENTIRE file
 * 4. Click "Deploy" (top right) -> "New deployment"
 * 5. Click the Gear icon ⚙️ next to 'Select type' -> Choose "Web app"
 * 6. Set Description: "PDV Sync Webhook"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL!
 * 9. Click "Deploy", authorize permissions, and COPY the Web app URL.
 * 10. Paste the URL into your PDV app 1-Click Sync Hub!
 */

// If you created this script inside your Google Sheet, leave this blank ("").
// If using standalone script, paste your Google Sheet URL or ID below.
var SPREADSHEET_URL_OR_ID = "";

function getSpreadsheet() {
  if (SPREADSHEET_URL_OR_ID && SPREADSHEET_URL_OR_ID.trim() !== "") {
    var trimmed = SPREADSHEET_URL_OR_ID.trim();
    if (trimmed.startsWith("http")) {
      return SpreadsheetApp.openByUrl(trimmed);
    }
    return SpreadsheetApp.openById(trimmed);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Handle incoming POST requests from PDV Web App
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 sec lock to prevent concurrent write collisions
  } catch (err) {
    return createJsonResponse({ result: "error", error: "Script lock timeout - busy writing." });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ result: "error", error: "No post data received" });
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = getSpreadsheet();
    if (!ss) {
      return createJsonResponse({ result: "error", error: "Could not open Google Spreadsheet. Ensure script is bound to a Sheet or SPREADSHEET_URL_OR_ID is filled." });
    }

    // 1. Batch Sync: Sync ALL tables in 1 Click
    if (payload.action === "sync_all" && payload.tables) {
      var syncSummary = {};
      var tableNames = Object.keys(payload.tables);

      tableNames.forEach(function (tName) {
        var tableData = payload.tables[tName];
        var sheet = getOrCreateSheet(ss, tName);

        if (tableData.headers && tableData.headers.length > 0) {
          ensureHeaders(sheet, tableData.headers);
        }

        if (tableData.rows && tableData.rows.length > 0) {
          // If mode is replace, clear old data (keep header)
          if (payload.mode === "replace") {
            var lastRow = sheet.getLastRow();
            if (lastRow > 1) {
              sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
            }
          }

          tableData.rows.forEach(function (row) {
            var rowArray = Array.isArray(row) ? row : Object.values(row);
            sheet.appendRow(rowArray);
          });
          syncSummary[tName] = tableData.rows.length + " records written";
        } else {
          syncSummary[tName] = "Header verified (0 rows)";
        }
      });

      // Remove default empty "Sheet1" if custom tabs exist
      cleanupDefaultSheet(ss);

      return createJsonResponse({
        result: "success",
        message: "All tables synced successfully!",
        summary: syncSummary,
        sheetUrl: ss.getUrl()
      });
    }

    // 2. Single Table Sync
    var sheetName = payload.sheetName || "Sheet1";
    var sheet = getOrCreateSheet(ss, sheetName);
    var headers = payload.headers || [];

    if (headers.length > 0) {
      ensureHeaders(sheet, headers);
    }

    if (payload.isBatch && Array.isArray(payload.data)) {
      if (payload.mode === "replace") {
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
      }
      payload.data.forEach(function (row) {
        var rowArray = Array.isArray(row) ? row : Object.values(row);
        sheet.appendRow(rowArray);
      });
    } else if (payload.data) {
      var rowToAdd = Array.isArray(payload.data) ? payload.data : Object.values(payload.data);
      sheet.appendRow(rowToAdd);
    }

    cleanupDefaultSheet(ss);

    return createJsonResponse({
      result: "success",
      sheetName: sheetName,
      rowCount: sheet.getLastRow(),
      sheetUrl: ss.getUrl()
    });

  } catch (err) {
    return createJsonResponse({ result: "error", error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET request for ping/health check
 */
function doGet(e) {
  try {
    var ss = getSpreadsheet();
    return createJsonResponse({
      status: "alive",
      message: "PDV Google Sheets Webhook is active and connected!",
      sheetUrl: ss ? ss.getUrl() : null,
      sheetName: ss ? ss.getName() : null
    });
  } catch (err) {
    return createJsonResponse({ status: "error", error: err.toString() });
  }
}

/**
 * Helpers
 */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1e293b"); // Slate dark
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
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
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
