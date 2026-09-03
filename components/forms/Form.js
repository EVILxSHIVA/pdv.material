"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import { fields } from "@/data/fields";
import History from "./History";
import "@/components/ui/ui.css";
import "./forms.css";

/**
 * Reusable Form for:
 * 1. New Purchase ("purchase")
 * 2. Material Issue ("issue")
 * 3. Material Consumption ("consumption")
 */
export default function Form({ kind, title }) {
  const router = useRouter();
  const isPurchase = kind === "purchase";
  const formFieldList = fields[kind] || fields.purchase;

  // 1. Form state
  const [fieldValues, setFieldValues] = useState({});
  const [items, setItems] = useState([
    { product: "", quantity: 1, unit: "Nos", rate: 0, consumed: 0 },
  ]);
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // 2. Field change helper
  const handleFieldChange = (name, val) => {
    setFieldValues((prev) => ({ ...prev, [name]: val }));
  };

  // 3. Item row helpers
  const updateItem = (index, key, val) => {
    const copy = [...items];
    copy[index][key] = val;
    setItems(copy);
  };

  const addItem = () => {
    setItems([...items, { product: "", quantity: 1, unit: "Nos", rate: 0, consumed: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // 4. Calculations (Subtotal and 18% GST for purchases)
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gstAmount;

  // 5. Save form to localStorage
  const handleSave = (e) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString("en-GB");

    if (isPurchase) {
      // Save to purchases list
      const piNumber = fieldValues["PI Number"] || `PI-${Date.now().toString().slice(-4)}`;
      const newPurchase = [
        piNumber,
        fieldValues["PI Date"] || today,
        fieldValues["Supplier"] || "Direct Supplier",
        fieldValues["Quotation Number"] || "QT-Auto",
        String(items.length),
        `₹ ${grandTotal.toLocaleString()}`,
        "Approved",
      ];

      const existing = JSON.parse(localStorage.getItem("materialflow_real_purchases") || "[]");
      localStorage.setItem("materialflow_real_purchases", JSON.stringify([newPurchase, ...existing]));

      setMessage(`✓ Purchase ${piNumber} saved! Redirecting...`);
      setTimeout(() => router.push("/purchases"), 1000);
    } else {
      // Save to material issue or consumption history
      const recordNumber = fieldValues["Issue Number"] || fieldValues["Consumption Number"] || `${kind === "issue" ? "MI" : "MC"}-${Date.now().toString().slice(-4)}`;
      const newRecord = {
        number: recordNumber,
        date: fieldValues["Issue Date"] || fieldValues["Date"] || today,
        department: fieldValues["Department / Site"] || "Main Site",
        itemsCount: items.length,
        status: "Completed",
      };

      const key = `materialflow_real_${kind}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([newRecord, ...existing]));

      setMessage(`✓ Record ${recordNumber} saved successfully!`);
      setReloadKey((prev) => prev + 1);
      setFieldValues({});
      setItems([{ product: "", quantity: 1, unit: "Nos", rate: 0, consumed: 0 }]);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <Shell>
      <Title title={title} desc={`Record and track ${title.toLowerCase()} operations.`} />

      {message && (
        <div style={{ padding: "12px", background: "#ecfdf5", color: "#065f46", borderRadius: "8px", marginBottom: "16px", fontWeight: "bold" }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Basic Information */}
        <section className="card formCard">
          <div className="sectionHead">
            <h2>{isPurchase ? "Purchase Details" : `${title} Details`}</h2>
          </div>
          <div className="formGrid">
            {formFieldList.map((name) => (
              <label key={name}>
                {name}
                <input
                  type={name.toLowerCase().includes("date") ? "date" : "text"}
                  placeholder={`Enter ${name.toLowerCase()}`}
                  value={fieldValues[name] || ""}
                  onChange={(e) => handleFieldChange(name, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Section 2: Items List */}
        <section className="card formCard">
          <div className="sectionHead">
            <h2>{isPurchase ? "Products" : "Materials"}</h2>
            <button type="button" className="secondary" onClick={addItem}>+ Add Item</button>
          </div>

          <div className="itemList">
            {items.map((item, i) => (
              <div className="item" key={i}>
                <label>
                  Product
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    value={item.product}
                    onChange={(e) => updateItem(i, "product", e.target.value)}
                  />
                </label>

                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                </label>

                <label>
                  Unit
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                  />
                </label>

                {isPurchase && (
                  <label>
                    Rate (₹)
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                    />
                  </label>
                )}

                <button type="button" className="remove" onClick={() => removeItem(i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Summary (For Purchases) */}
        {isPurchase && (
          <section className="summary">
            <span>Subtotal: <b>₹ {subtotal.toLocaleString()}</b></span>
            <span>GST (18%): <b>₹ {gstAmount.toLocaleString()}</b></span>
            <strong>Grand Total: <b>₹ {grandTotal.toLocaleString()}</b></strong>
          </section>
        )}

        {/* Section 4: Action Buttons */}
        <section className="formActions">
          <button type="button" className="secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="primary">{isPurchase ? "Save Purchase" : "Save Record"}</button>
        </section>
      </form>

      {/* History table for Issue and Consumption */}
      {!isPurchase && <History kind={kind} title={`${title} History`} refreshTrigger={reloadKey} />}
    </Shell>
  );
}
