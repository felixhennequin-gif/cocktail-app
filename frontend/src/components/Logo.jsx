export default function Logo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 180 36"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cocktails"
    >
      <text
        x="0"
        y="28"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="500"
        fontSize="30"
        fill="currentColor"
        letterSpacing="1.5"
      >
        Cocktails
      </text>
    </svg>
  )
}
