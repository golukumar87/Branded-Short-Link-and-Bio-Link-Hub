export function Badge({ className = "", ...props }) {
  return <span className={`badge ${className}`} {...props} />;
}
