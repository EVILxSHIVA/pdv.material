/**
 * Helper function to download data as an Excel-compatible CSV file
 * Includes UTF-8 BOM (\uFEFF) so Excel opens it with correct formatting
 * and displays currency symbols (like ₹) without errors.
 */
export function exportToExcel({ filename = "Export", headers = [], rows = [] }) {
  if (rows.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Helper to escape individual cells (wrap in quotes if contains comma, quote, or newline)
  const escapeCell = (value) => {
    if (value === null || value === undefined) {
      return '""';
    }
    const stringValue = String(value);
    // Replace internal quotes with double quotes
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  };

  // 1. Format Header Row
  const headerLine = headers.map(escapeCell).join(",");

  // 2. Format Data Rows
  const dataLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map(escapeCell).join(",");
    }
    return Object.values(row).map(escapeCell).join(",");
  });

  // 3. Combine with newlines and UTF-8 Byte Order Mark
  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

  // 4. Create a Blob and trigger browser file download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;

  // Add date stamp to filename, e.g. Suppliers_2026-09-01.csv
  const todayDate = new Date().toISOString().slice(0, 10);
  downloadLink.download = `${filename}_${todayDate}.csv`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Clean up memory URL
  URL.revokeObjectURL(downloadUrl);
}
