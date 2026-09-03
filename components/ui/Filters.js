"use client";

import { useState } from "react";

// Filter toolbar with search input, status dropdown, and mobile filter dialog
export function Filters({
  search = "",
  onSearchChange,
  status = "All Status",
  onStatusChange,
  onClear,
}) {
  // Mobile filter popup toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Helper when user changes text in search box
  const handleSearchInput = (e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  // Helper when user selects a status from dropdown
  const handleStatusSelect = (e) => {
    if (onStatusChange) {
      onStatusChange(e.target.value);
    }
  };

  return (
    <>
      <div className="toolbar">
        {/* Search input */}
        <div className="search">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={handleSearchInput}
          />
        </div>

        {/* Desktop Filter Dropdowns */}
        <div className="filterInputs">
          <select value={status} onChange={handleStatusSelect}>
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>

          {/* Button to reset filters */}
          <button type="button" className="secondary" onClick={onClear}>
            Clear filters
          </button>
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          className="filterBtn"
          onClick={() => setIsMobileFilterOpen(true)}
        >
          ☷ Filters
        </button>
      </div>

      {/* Mobile Filter Modal Sheet */}
      {isMobileFilterOpen && (
        <div
          className="modalWrap"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="filterModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHead">
              <h3>Filters</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                ×
              </button>
            </div>

            <label>
              Status
              <select value={status} onChange={handleStatusSelect}>
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </label>

            <button
              type="button"
              className="primary"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </>
  );
}
