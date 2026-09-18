"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import "../login/login.css";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Missing reset token. Please request a new link from the forgot password page.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Unable to reset password.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      setErrorMessage("Failed to connect to server. Please try again.");
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
            Set new password
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginTop: "6px" }}>
            Please choose a strong password with at least 8 characters.
          </p>
        </div>

        {errorMessage && (
          <div className="authErrorAlert" style={{ marginBottom: "18px" }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "13.5px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✓</div>
            <b>Password updated successfully!</b>
            <p style={{ marginTop: "4px", fontSize: "13px" }}>
              Redirecting you to the sign in page...
            </p>
            <div style={{ marginTop: "14px" }}>
              <Link href="/login" style={{ color: "#4f46e5", fontWeight: "600" }}>
                Click here if not redirected automatically ➔
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="authForm">
            <div className="formFieldGroup">
              <label className="fieldLabel" htmlFor="newPass">
                New Password
              </label>
              <div className="inputWrapper">
                <input
                  id="newPass"
                  type={showPassword ? "text" : "password"}
                  required
                  className="textInput hasToggle"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="passwordToggleBtn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="formFieldGroup">
              <label className="fieldLabel" htmlFor="confirmPass">
                Confirm New Password
              </label>
              <input
                id="confirmPass"
                type={showPassword ? "text" : "password"}
                required
                className="textInput"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Checklist */}
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span style={{ fontWeight: "600", display: "block", marginBottom: "4px" }}>
                Password Requirements:
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: password.length >= 8 ? "#16a34a" : "#64748b" }}>
                <span>{password.length >= 8 ? "✓" : "○"}</span>
                <span>Minimum 8 characters</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: password && password === confirmPassword ? "#16a34a" : "#64748b",
                }}
              >
                <span>{password && password === confirmPassword ? "✓" : "○"}</span>
                <span>Passwords match</span>
              </div>
            </div>

            <button type="submit" className="submitAuthBtn" disabled={isSubmitting}>
              {isSubmitting ? "Updating password..." : "Update Password"}
            </button>

            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <Link href="/login" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>
                ← Cancel and return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading reset form...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
