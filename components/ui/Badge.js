"use client";

export function Badge({ children, variant }) {
  if (!children) return null;
  const val = String(children).trim();
  const lower = val.toLowerCase();

  // Classify badge variant if not explicitly provided
  let determinedVariant = variant;
  if (!determinedVariant) {
    if (
      lower.includes("good") ||
      lower.includes("active") ||
      lower.includes("paid") ||
      lower.includes("completed") ||
      lower.includes("success") ||
      lower.includes("approved") ||
      lower.includes("healthy") ||
      lower.includes("delivered") ||
      lower.includes("inward")
    ) {
      determinedVariant = "success";
    } else if (
      lower.includes("low") ||
      lower.includes("pending") ||
      lower.includes("warning") ||
      lower.includes("waiting") ||
      lower.includes("attention") ||
      lower.includes("requested")
    ) {
      determinedVariant = "warning";
    } else if (lower.includes("partial")) {
      determinedVariant = "partial";
    } else if (
      lower.includes("critical") ||
      lower.includes("overdue") ||
      lower.includes("danger") ||
      lower.includes("urgent") ||
      lower.includes("rejected") ||
      lower.includes("failed")
    ) {
      determinedVariant = "danger";
    } else if (
      lower.includes("issued") ||
      lower.includes("shipped") ||
      lower.includes("dispatched")
    ) {
      determinedVariant = "info";
    } else if (lower.includes("returned")) {
      determinedVariant = "purple";
    } else {
      determinedVariant = "neutral";
    }
  }

  return (
    <span className={`statusBadge ${determinedVariant}`}>
      <span className="badgeDot" />
      <span>{val}</span>
    </span>
  );
}
