"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { exportToExcel } from "@/lib/exportToExcel";

/**
 * Real Activity History Table for Material Issue and Material Consumption
 * Records entered manually by user.
 */
export default function History({ kind, title, refreshTrigger }) {
  const storageKey = `pdv_app_${kind}`;
  const [historyList, setHistoryList] = useState([]);

  const historyHeaders = [
    "Date",
    "Department / Site",
    "Items Count",
    "Status",
  ];

  // Load history records from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem(`materialflow_real_${kind}`);
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistoryList(parsed);
          return;
        }
      }
      setHistoryList([]);
    } catch (error) {
      console.warn("Could not read history:", error);
      setHistoryList([]);
    }
  }, [storageKey, refreshTrigger]);

  // Export history to Excel
  const handleExportHistory = () => {
    const formattedRows = historyList.map((entry) => [
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
          <p>Real-time log of recent vouchers saved in your local workspace.</p>
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

      {/* Mobile-first compact cards (hidden on desktop) */}
      <div className="mobileCardList">
        {historyList.length === 0 ? (
          <div className="emptyTable">
            <p>No {title.toLowerCase()} recorded yet.</p>
          </div>
        ) : (
          historyList.map((entry, index) => (
            <div key={index} className="mobileDataCard">
              <div className="mobileCardHeader">
                <div className="mobileCardTitleArea">
                  <h3 className="mobileCardTitle">{entry.department}</h3>
                  <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>{entry.date}</small>
                </div>
                <Badge>{entry.status || "Completed"}</Badge>
              </div>
              <div className="mobileCardBody">
                <div className="mobileMetricItem">
                  <span className="mobileMetricLabel">Items Count</span>
                  <strong className="mobileMetricVal highlight">{entry.itemsCount}</strong>
                </div>
              </div>
            </div>
          ))
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
                <td colSpan={4} className="emptyTable">
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
                    <strong style={{ color: "var(--text-primary)" }}>{entry.date}</strong>
                  </td>
                  <td>{entry.department}</td>
                  <td>{entry.itemsCount} {Number(entry.itemsCount) === 1 ? "item" : "items"}</td>
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
