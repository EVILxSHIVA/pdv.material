"use client";

import { useState } from "react";
import Link from "next/link";
import "../login/login.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid registered email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Unable to process request.");
        setIsSubmitting(false);
        return;
      }

      setSuccessData(data);
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="loginWrapper" style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        className="loginCardInner"
        style={{
          background: "#ffffff",
          padding: "40px 36px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
          border: "1px solid #e2e8f0",
          maxWidth: "460px",
          width: "90%",
          margin: "40px auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            className="brandLogoBadge"
            style={{ margin: "0 auto 16px auto", width: "48px", height: "48px", fontSize: "22px" }}
          >
            P
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
            Forgot your password?
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginTop: "6px" }}>
            Enter your registered email and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {errorMessage && (
          <div className="authErrorAlert" style={{ marginBottom: "18px" }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successData ? (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "13.5px",
              lineHeight: "1.5",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✓</div>
            <b>Check your email</b>
            <p style={{ marginTop: "4px", fontSize: "13px" }}>{successData.message}</p>

            {successData.resetUrl && (
              <div style={{ marginTop: "16px" }}>
                <Link
                  href={successData.resetUrl}
                  className="submitAuthBtn"
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  Proceed to Reset Password ➔
                </Link>
              </div>
            )}

            <div style={{ marginTop: "16px" }}>
              <Link href="/login" style={{ color: "#4f46e5", fontSize: "13px", fontWeight: "600" }}>
                ← Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="authForm">
            <div className="formFieldGroup">
              <label className="fieldLabel" htmlFor="forgotEmail">
                Email address
              </label>
              <input
                id="forgotEmail"
                type="email"
                required
                className="textInput"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="submitAuthBtn" disabled={isSubmitting}>
              {isSubmitting ? "Sending instructions..." : "Send Reset Instructions"}
            </button>

            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <Link
                href="/login"
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
