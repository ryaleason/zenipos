export function CustomDroneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" x2="10" y1="8" y2="8" />
      <line x1="6" x2="6" y1="12" y2="12" />
      <line x1="10" x2="10" y1="12" y2="12" />
      <line x1="14" x2="18" y1="12" y2="12" />
      <line x1="6" x2="6" y1="16" y2="16" />
      <line x1="10" x2="10" y1="16" y2="16" />
      <line x1="14" x2="18" y1="16" y2="16" />
    </svg>
  )
}
