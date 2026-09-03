"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";

/**
 * Real Activity History Table for Material Issue and Material Consumption
 * Reads only what the user has saved and supports Excel export.
 */
export default function History({ kind, title, refreshTrigger }) {
  const storageKey = `materialflow_real_${kind}`;
  const [historyList, setHistoryList] = useState([]);

  const historyHeaders = [
    "Number",
    "Date",
    "Department / Site",
    "Items Count",
    "Status",
  ];

  // Load history records from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistoryList(parsed);
        }
      } else {
        setHistoryList([]);
      }
    } catch (error) {
      console.warn("Could not read history:", error);
    }
  }, [storageKey, refreshTrigger]);

  // Export history to Excel
  const handleExportHistory = () => {
    const formattedRows = historyList.map((entry) => [
      entry.number,
      entry.date,
      entry.department,
      entry.itemsCount,
      entry.status || "Completed",
    ]);

    exportToExcel({
      filename: `${title.replace(/\s+/g, "_")}`,
      headers: historyHeaders,
      rows: formattedRows,
    });
  };

  return (
    <section className="card tableCard">
      <div className="sectionHead">
        <div>
          <h2>{title}</h2>
          <p>Recent recorded activity entered by you</p>
        </div>

        {historyList.length > 0 && (
          <button
            type="button"
            className="secondary"
            onClick={handleExportHistory}
            title="Download history as an Excel file"
          >
            ⤓ Export History
          </button>
        )}
      </div>

      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              {historyHeaders.map((head) => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {historyList.length === 0 ? (
              <tr>
                <td colSpan={5} className="emptyTable">
                  <div className="emptyState">
                    <span>📋</span>
                    <p>No {title.toLowerCase()} recorded yet.</p>
                    <small>
                      Fill in the form above and click "Save Record" to see your data here.
                    </small>
                  </div>
                </td>
              </tr>
            ) : (
              historyList.map((entry, index) => (
                <tr key={index}>
                  <td>
                    <strong>{entry.number}</strong>
                  </td>
                  <td>{entry.date}</td>
                  <td>{entry.department}</td>
                  <td>{entry.itemsCount}</td>
                  <td>
                    <Badge>{entry.status || "Completed"}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
