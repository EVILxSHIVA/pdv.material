// Status Badge component with specific styling for Paid, Approved, Pending, Issued, etc.
export function Badge({ children }) {
  const text = String(children || "").trim();
  const lower = text.toLowerCase();

  let statusClass = "active";
  if (lower.includes("paid")) statusClass = "paid";
  else if (lower.includes("approved")) statusClass = "approved";
  else if (lower.includes("pending")) statusClass = "pending";
  else if (lower.includes("issued") || lower === "issue") statusClass = "issued";
  else if (lower.includes("completed")) statusClass = "completed";
  else if (lower.includes("returned") || lower.includes("ret")) statusClass = "returned";
  else if (lower.includes("inactive")) statusClass = "inactive";
  else if (lower.includes("active")) statusClass = "active";

  return <span className={`badge ${statusClass}`}>{children}</span>;
}
