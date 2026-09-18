"use client";

import { useEffect } from "react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "./detail-drawer.css";

export default function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  tabs = [],
  activeTab,
  onTabChange,
  children,
  footerActions,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      lockScroll();
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (isOpen) unlockScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawerBackdrop" onClick={onClose}>
      <div className="drawerPanel" onClick={(e) => e.stopPropagation()}>
        <div className="sheetDragHandle" />
        <div className="drawerHeader">
          <div className="drawerTitleArea">
            <div className="drawerTitleRow">
              <h3>{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="drawerSubtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="drawerCloseBtn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        {tabs.length > 0 && (
          <div className="drawerTabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`drawerTab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => onTabChange && onTabChange(t.id)}
              >
                {t.icon && <span className="drawerTabIcon">{t.icon}</span>}
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className="drawerTabCount">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="drawerBody">{children}</div>
        {footerActions && <div className="drawerFooter">{footerActions}</div>}
      </div>
    </div>
  );
}
