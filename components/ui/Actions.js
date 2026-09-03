// Row action buttons (View, Edit, Delete) for data tables
export function Actions({ onView, onEdit, onDelete }) {
  return (
    <div className="actions">
      <button type="button" onClick={onView}>
        View
      </button>

      <button type="button" onClick={onEdit}>
        Edit
      </button>

      <button type="button" className="danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
