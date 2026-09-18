"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthContext";
import "../supplier.css";

export default function SupplierProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/supplier/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.supplier) {
            setProfile(json.supplier);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const p = profile || {
    companyName: user?.supplierName || "Supplier Company",
    code: user?.supplierCode || "SUP-001",
    contactPerson: user?.name || "Contact Representative",
    email: user?.email || "supplier@example.com",
    mobile: "+91 9876543210",
    gst: "08AABCV1234F1Z5",
    status: "Active",
  };

  return (
    <Shell>
      <div className="sectionHeaderRow" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
            Registered Supplier Profile
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Official corporate record, taxation credentials, and supplier contact information.
          </p>
        </div>
      </div>

      <div className="profileInfoGrid">
        {/* Business Identity */}
        <div className="profileCard">
          <h3 className="profileCardTitle">
            <span>🏢</span> Business Entity
          </h3>
          <div className="profileFieldRow">
            <span className="profileFieldLabel">Company Legal Name</span>
            <span className="profileFieldValue" style={{ fontSize: "16px", color: "var(--brand-600)" }}>
              {p.companyName}
            </span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Supplier Code</span>
            <span className="profileFieldValue">
              <code>{p.code}</code>
            </span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Account Status</span>
            <div style={{ marginTop: "4px" }}>
              <Badge status={p.status || "Active"} />
            </div>
          </div>
        </div>

        {/* Contact & Administration */}
        <div className="profileCard">
          <h3 className="profileCardTitle">
            <span>👤</span> Contact & Representation
          </h3>
          <div className="profileFieldRow">
            <span className="profileFieldLabel">Primary Representative</span>
            <span className="profileFieldValue">{p.contactPerson}</span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Registered Email</span>
            <span className="profileFieldValue">{p.email}</span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Telephone / Mobile</span>
            <span className="profileFieldValue">{p.mobile || "—"}</span>
          </div>
        </div>

        {/* Statutory & Taxation */}
        <div className="profileCard">
          <h3 className="profileCardTitle">
            <span>⚖️</span> Statutory & Tax Information
          </h3>
          <div className="profileFieldRow">
            <span className="profileFieldLabel">GSTIN (Goods and Services Tax ID)</span>
            <span className="profileFieldValue">
              <code>{p.gst || "08AABCV1234F1Z5"}</code>
            </span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Payment Settlement Terms</span>
            <span className="profileFieldValue">Net 30 Days (Standard Corporate)</span>
          </div>

          <div className="profileFieldRow">
            <span className="profileFieldLabel">Registered State</span>
            <span className="profileFieldValue">Rajasthan / Central Jurisdiction</span>
          </div>
        </div>
      </div>

      {/* Profile Modification Notice */}
      <div
        style={{
          marginTop: "24px",
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: "8px",
          padding: "16px 20px",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        <b style={{ color: "var(--text-primary)" }}>Need to modify banking or GST details?</b>
        <p style={{ marginTop: "4px" }}>
          For statutory compliance, changes to company name, bank accounts, or GST numbers require
          written verification with the PDV Finance team. Submit updated documentation to{" "}
          <code>finance@pdv.com</code>.
        </p>
      </div>
    </Shell>
  );
}
