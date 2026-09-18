"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const dashboardHref = user?.role === "SUPPLIER" ? "/supplier" : "/";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-canvas, #f8fafc)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "48px 36px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            color: "#dc2626",
            margin: "0 auto 20px auto",
          }}
        >
          🔒
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
          Access Restricted
        </h1>

        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", marginBottom: "28px" }}>
          You don&apos;t have permission to access this section of the workspace. Please return to
          your authorized dashboard.
        </p>

        <Link
          href={dashboardHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "44px",
            padding: "0 24px",
            background: "#4f46e5",
            color: "#ffffff",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "14px",
            textDecoration: "none",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
          }}
        >
          Return to Dashboard ➔
        </Link>
      </div>
    </div>
  );
}
