// Page header component that displays a main title, description, and an optional button
export function Title({ title, desc, action }) {
  return (
    <div className="pageTitle">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>

      {/* Optional action button, e.g. "+ Add Supplier" */}
      {action && action}
    </div>
  );
}
