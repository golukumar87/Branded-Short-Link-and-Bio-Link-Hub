export function Input({ label, className = "", rightElement, ...props }) {
  if (!rightElement) {
    return (
      <label className={`field ${className}`}>
        {label && <span>{label}</span>}
        <input {...props} />
      </label>
    );
  }

  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <div className="input-action-wrapper">
        <input {...props} />
        {rightElement}
      </div>
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <textarea {...props} />
    </label>
  );
}
