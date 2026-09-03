// A simple color badge component to display status (e.g. Active, Inactive, Pending)
export function Badge({ children }) {
  // Convert text like "Active" to lowercase "active" for CSS class matching
  const statusClass = String(children || "").toLowerCase();

  return (
    <span className={`badge ${statusClass}`}>
      {children}
    </span>
  );
}
