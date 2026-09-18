"use client";

import { useState, useRef, useEffect } from "react";
import "./searchable-select.css";

export default function SearchableSelect({
  options = [], // [{ value, label, sublabel, badge, extra }]
  value,
  onChange,
  placeholder = "Search and select...",
  label,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Selected item object
  const selectedItem = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value || opt.label === value
  );

  const selectedDisplayLabel = selectedItem
    ? typeof selectedItem === "string"
      ? selectedItem
      : selectedItem.label
    : value || "";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const text = typeof opt === "string" ? opt : `${opt.label} ${opt.sublabel || ""}`;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (opt) => {
    const val = typeof opt === "string" ? opt : opt.value || opt.label;
    onChange(val, opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="searchableSelectContainer" ref={containerRef}>
      {label && (
        <label className="selectInputLabel">
          {label} {required && <span className="reqStar">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        className={`selectTrigger ${isOpen ? "open" : ""} ${!value ? "empty" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className="selectTriggerText">
          {selectedDisplayLabel || placeholder}
        </span>
        <span className="selectTriggerCaret">▾</span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="selectDropdownMenu">
          <div className="selectSearchBox">
            <span className="selectSearchIcon">🔍</span>
            <input
              type="text"
              autoFocus
              placeholder="Type to filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                className="clearSearchBtn"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="selectOptionsList">
            {filteredOptions.length === 0 ? (
              <div className="noOptionsMsg">No matching items found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === "string" ? opt : opt.value || opt.label;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const optSub = typeof opt === "object" ? opt.sublabel : null;
                const optBadge = typeof opt === "object" ? opt.badge : null;
                const isSelected = optVal === value;

                return (
                  <div
                    key={optVal || idx}
                    className={`selectOptionItem ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <div className="optionTextCol">
                      <span className="optionLabel">{optLabel}</span>
                      {optSub && <span className="optionSublabel">{optSub}</span>}
                    </div>
                    {optBadge && <span className="optionBadge">{optBadge}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
