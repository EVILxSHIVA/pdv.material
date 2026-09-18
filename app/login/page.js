"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import "./login.css";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const { login } = useAuth();

  // Mobile two-step state: "intro" shows branding, "form" shows login
  const [mobileStep, setMobileStep] = useState("intro");

  // Form State
  const [role, setRole] = useState("ADMIN"); // 'ADMIN' | 'SUPPLIER'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
        role,
        rememberMe,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Unable to sign in. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Successful login -> Redirect based on role and return URL
      const user = result.user;
      if (from && !from.startsWith("/login")) {
        // Only redirect to 'from' if allowed by role
        if (user.role === "SUPPLIER" && !from.startsWith("/supplier")) {
          router.push("/supplier");
        } else {
          router.push(from);
        }
      } else {
        if (user.role === "ADMIN") {
          router.push("/");
        } else {
          router.push("/supplier");
        }
      }
      router.refresh();
    } catch (err) {
      setErrorMessage("Something went wrong. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  // Quick fill demo credentials for reviewer convenience
  const handleQuickFill = (targetRole) => {
    setRole(targetRole);
    setErrorMessage("");
    if (targetRole === "ADMIN") {
      setEmail("admin@pdv.com");
      setPassword("Admin@PDV2026!");
    } else {
      setEmail("vasu@example.com");
      setPassword("Supplier@2026!");
    }
  };

  return (
    <div className={`loginWrapper mobileStep-${mobileStep}`}>
      <div className="loginContainer">
        {/* ===================================================================
            LEFT SECTION: Brand & Product Value
            =================================================================== */}
        <section className={`loginBrandSection${mobileStep === "form" ? " mobileIntroHidden" : ""}`}>
          {/* Header Row */}
          <div className="brandHeaderRow">
            <div className="brandLogoBadge">P</div>
            <div>
              <h1 className="brandCompanyTitle">PDV Material Management</h1>
              <span className="brandProductTag">Enterprise Workspace</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="brandHeroBody">
            <div className="brandHeroBadge">
              <span className="brandHeroBadgeDot" />
              <span>Operations & Procurement ERP</span>
            </div>

            <h2 className="brandHeroHeading">
              Manage materials, purchases, suppliers, and site operations from one secure workspace.
            </h2>

            <p className="brandHeroSubtitle">
              Real-time inventory valuations, dispatch tracking, verified contractor consumption,
              and dedicated supplier portals built for infrastructure projects.
            </p>

            {/* Product Capabilities */}
            <div className="brandCapabilityGrid">
              <div className="capabilityCard">
                <div className="capabilityIconWrap">📦</div>
                <div className="capabilityTextGroup">
                  <span className="capabilityTitle">Inventory & Materials</span>
                  <span className="capabilityDesc">Live stock & reorder levels</span>
                </div>
              </div>

              <div className="capabilityCard">
                <div className="capabilityIconWrap">▣</div>
                <div className="capabilityTextGroup">
                  <span className="capabilityTitle">Purchase Management</span>
                  <span className="capabilityDesc">PI logs & billing records</span>
                </div>
              </div>

              <div className="capabilityCard">
                <div className="capabilityIconWrap">🏢</div>
                <div className="capabilityTextGroup">
                  <span className="capabilityTitle">Supplier Management</span>
                  <span className="capabilityDesc">Verified supplier directory</span>
                </div>
              </div>

              <div className="capabilityCard">
                <div className="capabilityIconWrap">🏗</div>
                <div className="capabilityTextGroup">
                  <span className="capabilityTitle">Site & Party Tracking</span>
                  <span className="capabilityDesc">Dispatches & site usage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only CTA: Continue to Login */}
          <button
            type="button"
            className="mobileContinueBtn"
            onClick={() => setMobileStep("form")}
          >
            Continue to Login <span aria-hidden="true">→</span>
          </button>

          {/* Footer Security Assurance */}
          <div className="brandFooterRow">
            <span className="securityPill">
              <span>🔒</span> Enterprise Role-Based Access Control
            </span>
            <span>v2.6.0 Production</span>
          </div>
        </section>

        {/* ===================================================================
            RIGHT SECTION: Login Card
            =================================================================== */}
        <section className={`loginFormSection${mobileStep === "intro" ? " mobileFormHidden" : ""}`}>
          <div className="loginCardInner">
            {/* Mobile-only Back button */}
            <button
              type="button"
              className="mobileBackBtn"
              onClick={() => setMobileStep("intro")}
            >
              <span aria-hidden="true">←</span> Back
            </button>
            {/* Greeting Header */}
            <div className="loginHeaderBlock">
              <h2 className="loginGreeting">Welcome back</h2>
              <p className="loginSubtext">
                Sign in to access your PDV Material Management workspace.
              </p>
            </div>

            {/* Role Segmented Selector */}
            <div className="roleSelectorGroup">
              <span className="roleSelectorLabel">Select Workspace Access Role</span>
              <div className="roleSegmentedBar" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "ADMIN"}
                  className={`roleTabBtn ${role === "ADMIN" ? "active" : ""}`}
                  onClick={() => {
                    setRole("ADMIN");
                    setErrorMessage("");
                  }}
                >
                  <span className="roleTabIcon">🛡️</span>
                  <span>Admin</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "SUPPLIER"}
                  className={`roleTabBtn ${role === "SUPPLIER" ? "active" : ""}`}
                  onClick={() => {
                    setRole("SUPPLIER");
                    setErrorMessage("");
                  }}
                >
                  <span className="roleTabIcon">🏢</span>
                  <span>Supplier</span>
                </button>
              </div>
            </div>

            {/* Inline Error Alert */}
            {errorMessage && (
              <div className="authErrorAlert" role="alert" style={{ marginBottom: "18px" }}>
                <span className="errorIcon">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="authForm" noValidate>
              {/* Email Input */}
              <div className="formFieldGroup">
                <label className="fieldLabel" htmlFor="loginEmail">
                  {role === "ADMIN" ? "Admin Email Address" : "Registered Supplier Email"}
                </label>
                <div className="inputWrapper">
                  <input
                    id="loginEmail"
                    type="email"
                    required
                    autoComplete="email"
                    className="textInput"
                    placeholder={
                      role === "ADMIN" ? "Enter your admin email" : "Enter your registered email"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="formFieldGroup">
                <div className="formFieldHeader">
                  <label className="fieldLabel" htmlFor="loginPassword">
                    Password
                  </label>
                  <Link href="/forgot-password" className="forgotLink" tabIndex={0}>
                    Forgot password?
                  </Link>
                </div>
                <div className="inputWrapper">
                  <input
                    id="loginPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="textInput hasToggle"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="passwordToggleBtn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="rememberRow">
                <input
                  type="checkbox"
                  className="rememberCheckbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="rememberText">Remember me for 7 days</span>
              </label>

              {/* Submit Button */}
              <button type="submit" className="submitAuthBtn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="btnSpinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>{role === "ADMIN" ? "Sign in as Admin" : "Sign in as Supplier"}</span>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Box */}
            <div className="quickDemoBox">
              <div className="quickDemoTitle">
                <span>🔑</span> Quick Demo Access
              </div>
              <div className="demoRow">
                <span>
                  Admin: <code>admin@pdv.com</code> / <code>Admin@PDV2026!</code>
                </span>
                <button
                  type="button"
                  className="quickFillBtn"
                  onClick={() => handleQuickFill("ADMIN")}
                >
                  Auto-fill
                </button>
              </div>
              <div className="demoRow">
                <span>
                  Supplier: <code>vasu@example.com</code> / <code>Supplier@2026!</code>
                </span>
                <button
                  type="button"
                  className="quickFillBtn"
                  onClick={() => handleQuickFill("SUPPLIER")}
                >
                  Auto-fill
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading workspace...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
