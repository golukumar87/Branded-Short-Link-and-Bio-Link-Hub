export function Button({ className = "", variant = "primary", size = "default", ...props }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />;
}
