// Simple SVG helmet fallback component for production reliability
export function HelmetFallback({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M12 2C8.5 2 5.5 4.5 5.5 8v3.5c0 1.5 0.5 3 1.5 4l1.5 2c0.5 0.5 1 1 2 1h3c1 0 1.5-0.5 2-1l1.5-2c1-1 1.5-2.5 1.5-4V8c0-3.5-3-6-6.5-6z"/>
      <circle cx="9" cy="10" r="1"/>
      <circle cx="15" cy="10" r="1"/>
      <path d="M8 13h8l-1 3h-6z"/>
    </svg>
  );
}