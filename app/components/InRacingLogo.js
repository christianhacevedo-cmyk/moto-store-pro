export default function InRacingLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded square */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="10"
        fill="#C6FF00"
      />
      
      {/* Inner track design - stylized R with curves */}
      <g>
        {/* Main vertical line */}
        <path
          d="M18 24 L18 44"
          stroke="#0a0a0a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Top curve - upper part of R */}
        <path
          d="M18 24 Q18 18 24 18 Q30 18 30 24 Q30 28 26 30 Q18 30 18 30"
          stroke="#0a0a0a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Diagonal leg of R */}
        <path
          d="M26 30 Q40 44 46 44"
          stroke="#0a0a0a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Accent circle */}
        <circle
          cx="22"
          cy="22"
          r="1.5"
          fill="#0a0a0a"
        />
      </g>
    </svg>
  );
}
