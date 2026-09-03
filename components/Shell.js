"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./shell.css";

// Navigation links for the sidebar
const navigationItems = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/suppliers", label: "Suppliers", icon: "♙" },
  { href: "/products", label: "Products", icon: "▦" },
  { href: "/purchases", label: "Purchases", icon: "▣" },
  { href: "/material-issue", label: "Material Issue", icon: "↗" },
  { href: "/material-consumption", label: "Consumption", icon: "◔" },
  { href: "/upload", label: "Upload Data", icon: "⇧" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Shell({ children }) {
  // Current page URL to highlight the active menu item
  const currentPath = usePathname();

  // State to control mobile sidebar drawer (open/close)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State to toggle compact mini sidebar on desktop
  const [isCompactSidebar, setIsCompactSidebar] = useState(false);

  // Find the label for the current page to show in the header breadcrumb
  const currentPage = navigationItems.find((item) => {
    if (item.href === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(item.href);
  });
  const pageTitle = currentPage ? currentPage.label : "Dashboard";

  return (
    <div className={`app ${isCompactSidebar ? "compact" : ""}`}>
      {/* Dim backdrop overlay for mobile when menu is open */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className="backdrop"
          aria-label="Close navigation"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        {/* Brand Logo & Name */}
        <div className="brand">
          <span className="brandMark">P</span>
          <span className="brandName">PDV Solutions</span>
          <button
            type="button"
            className="close"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <p className="navLabel">WORKSPACE</p>

        {/* Sidebar Links */}
        <nav>
          {navigationItems.map((item) => {
            // Check if this menu link matches current URL
            const isActive =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={isActive ? "active" : ""}
              >
                <i>{item.icon}</i>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer at bottom of sidebar */}
        <div className="sideFoot">
          <div className="avatar">SA</div>
          <div>
            <b>Shyam Aggarwal</b>
            <small>Administrator</small>
          </div>
        </div>
      </aside>

      {/* Main Workspace Page Area */}
      <main className="workspace">
        {/* Top Header */}
        <header>
          {/* Mobile hamburger button */}
          <button
            type="button"
            className="menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          {/* Desktop sidebar collapse button */}
          <button
            type="button"
            className="collapse"
            onClick={() => setIsCompactSidebar(!isCompactSidebar)}
            aria-label="Collapse sidebar"
          >
            ☰
          </button>

          {/* Breadcrumb Title */}
          <div className="crumb">
            Material Management <span>/</span> {pageTitle}
          </div>

          {/* Header Right Side */}
          <div className="headRight">
            <button
              type="button"
              aria-label="Notifications"
              className="iconButton"
            >
              ♢
            </button>
            <div className="headAvatar">SA</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
