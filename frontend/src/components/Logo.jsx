/**
 * Écume logo — refined wordmark + stars
 *
 * Usage:
 *   <Logo className="h-8" />                     — inherits text color from parent
 *   <Logo className="h-8 text-slate-900" />      — explicit light-mode color
 *   <Logo className="h-8 text-slate-100" />      — explicit dark-mode color
 *   <Logo className="h-8 text-slate-900 dark:text-slate-100" /> — responsive
 *
 * The gold stars use hardcoded fills (they stay gold in both themes).
 * The wordmark uses currentColor so it follows your text color utility.
 */
export default function Logo({ className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Écume"
      role="img"
      {...props}
    >
      <text
        x="0"
        y="36"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '36px',
          fontWeight: 500,
          fill: 'currentColor',
          letterSpacing: '2.8px',
        }}
      >
        Écume
      </text>
      {/* Primary star */}
      <path
        d="M154,18 L155.8,8 L157.6,18 L165,20.5 L157.6,23 L155.8,33 L154,23 L146.6,20.5 Z"
        fill="#C49A3C"
        opacity={0.88}
      />
      {/* Accent star */}
      <path
        d="M172,4 L173,0 L174,4 L178,5.5 L174,7 L173,11 L172,7 L168,5.5 Z"
        fill="#C49A3C"
        opacity={0.42}
      />
    </svg>
  );
}
