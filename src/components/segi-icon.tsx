export function SegiIcon({ size = 20, className, variant = "default" }: { size?: number; className?: string; variant?: "default" | "white" }) {
  const id = `segiGrad_${size}`;
  const bgFill = variant === "white" ? "transparent" : `url(#${id})`;
  const fgFill = variant === "white" ? "currentColor" : "white";
  const fgOpacity = variant === "white" ? 1 : 0.9;
  const showBg = variant !== "white";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showBg && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
      )}
      {showBg && <rect width="32" height="32" rx="8" fill={bgFill} />}
      <path
        d="M7 17.5C7 16.8 7.4 16.2 8 15.8L12.5 11.3C13 10.8 13.8 10.8 14.3 11.3L18 15C18.5 15.5 19.3 15.5 19.8 15L24.2 10.5C24.7 10 25.5 10.3 25.5 11V22C25.5 23.1 24.6 24 23.5 24H9C7.9 24 7 23.1 7 22V17.5Z"
        fill={fgFill}
        fillOpacity={fgOpacity}
      />
      <path
        d="M17.5 11.5L17.4 9.5C17.4 9 17.8 8.5 18.3 8.5H20.5C21 8.5 21.4 8.9 21.4 9.4V11.5C21.4 12.3 21.1 13 20.5 13.6L18.8 15.5C18.5 15.8 18 15.8 17.7 15.5L16 13.6C15.4 13 15.1 12.3 15.1 11.5H17.5Z"
        fill={fgFill}
        fillOpacity={fgOpacity}
      />
      <path
        d="M26 5L26.6 6.4L28 7L26.6 7.6L26 9L25.4 7.6L24 7L25.4 6.4Z"
        fill={fgFill}
        fillOpacity={variant === "white" ? 0.7 : 0.85}
      />
      <path
        d="M5 7L5.4 7.9L6.3 8.3L5.4 8.7L5 9.6L4.6 8.7L3.7 8.3L4.6 7.9Z"
        fill={fgFill}
        fillOpacity={variant === "white" ? 0.5 : 0.6}
      />
    </svg>
  );
}
