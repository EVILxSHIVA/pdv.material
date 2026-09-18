"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchAllEntities } from "@/lib/dataService";
import { Badge } from "@/components/ui/Badge";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import "./global-search.css";

export default function GlobalSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(searchAllEntities(""));
      setSelectedIndex(0);
    }
    return () => {
      if (isOpen) unlockScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      const res = searchAllEntities(query);
      setResults(res);
      setSelectedIndex(0);
    } else {
      // Show default top quick hits
      setResults(searchAllEntities("pipe").concat(searchAllEntities("valve")).slice(0, 8));
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (item) => {
    onClose();
    if (item.href) {
      router.push(item.href);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="searchModalBackdrop" onClick={onClose}>
      <div className="searchModalContainer" onClick={(e) => e.stopPropagation()}>
        {/* Search Header Bar */}
        <div className="searchModalHeader">
          <span className="searchIcon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anything... (materials, stock, suppliers, PI#, vouchers, sites)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="escBadge" onClick={onClose}>
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="searchResultsList">
          {results.length === 0 ? (
            <div className="searchEmpty">
              <p>No matches found for "{query}"</p>
              <small>Try searching for a product name, voucher code, supplier or site.</small>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`searchResultItem ${idx === selectedIndex ? "selected" : ""}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="searchResultLeft">
                  <span className="searchResultType">{item.type}</span>
                  <div className="searchResultTitle">{item.title}</div>
                  <div className="searchResultSub">{item.subtitle}</div>
                </div>
                <div className="searchResultRight">
                  {item.badge && <Badge>{item.badge}</Badge>}
                  <span className="searchArrow">↵</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="searchModalFooter">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
