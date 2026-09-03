"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { Badge } from "@/components/ui/Badge";
import "@/components/ui/ui.css";
import "./dashboard.css";

// 6 Quick action shortcuts
const shortcuts = [
  { icon: "+", label: "Add Supplier", href: "/suppliers" },
  { icon: "▦", label: "Add Product", href: "/products" },
  { icon: "+", label: "New Purchase", href: "/purchases/new" },
  { icon: "↗", label: "Material Issue", href: "/material-issue" },
  { icon: "◔", label: "Consumption", href: "/material-consumption" },
  { icon: "⇧", label: "Upload Bills", href: "/upload" },
];

export default function Dashboard() {
  const [purchases, setPurchases] = useState([]);

  // Load real purchases from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("materialflow_real_purchases") || "[]");
      setPurchases(saved);
    } catch (e) {
      console.warn("Could not read purchases:", e);
    }
  }, []);

  return (
    <Shell>
      <Title title="Dashboard" desc="Quick access to material operations." />

      {/* 1. Quick Action Cards */}
      <section className="card">
        <div className="sectionHead">
          <h2>Quick Actions</h2>
        </div>
        <div className="quickGrid">
          {shortcuts.map((s) => (
            <Link key={s.label} href={s.href} className="quick">
              <i>{s.icon}</i>
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Recent Purchases Table */}
      <section className="card tableCard" style={{ marginTop: "20px" }}>
        <div className="sectionHead">
          <h2>Recent Purchases ({purchases.length})</h2>
          <Link href="/purchases" className="textLink">View all →</Link>
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>PI #</th><th>Supplier</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="emptyTable">
                    <p>No purchases recorded yet.</p>
                    <Link href="/purchases/new" className="primary" style={{ display: "inline-block", marginTop: "8px" }}>
                      + Create Purchase
                    </Link>
                  </td>
                </tr>
              ) : (
                purchases.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td><strong>{row[0]}</strong></td>
                    <td>{row[2]}</td>
                    <td>{row[1]}</td>
                    <td>{row[4]}</td>
                    <td>{row[5]}</td>
                    <td><Badge>{row[6]}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
