export function DotCertificate({ size = "default" }) {
  const sizeMap = {
    small: { width: 50, height: 65 },
    default: { width: 80, height: 100 },
    large: { width: 120, height: 150 }
  };

  const dims = sizeMap[size];

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagon shape */}
      <path
        d="M 40 8 L 70 24 L 70 56 L 40 72 L 10 56 L 10 24 Z"
        fill="#2563EB"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      
      {/* HS2 label */}
      <text
        x="40"
        y="30"
        fontSize="11"
        fontWeight="bold"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
      >
        HS2
      </text>
      
      {/* DOT main text */}
      <text
        x="40"
        y="56"
        fontSize="24"
        fontWeight="900"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
      >
        DOT
      </text>
      
      {/* FMVSS No.218 */}
      <text
        x="40"
        y="72"
        fontSize="9"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontWeight="600"
      >
        FMVSS No.218
      </text>
      
      {/* CERTIFIED */}
      <text
        x="40"
        y="85"
        fontSize="8"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        CERTIFIED
      </text>
    </svg>
  );
}

export function EceCertificate({ size = "default" }) {
  const sizeMap = {
    small: { width: 50, height: 65 },
    default: { width: 80, height: 100 },
    large: { width: 120, height: 150 }
  };

  const dims = sizeMap[size];

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Black background rectangle */}
      <rect
        x="4"
        y="4"
        width="72"
        height="92"
        rx="8"
        fill="#1A1A1A"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      
      {/* Inner border line */}
      <rect
        x="8"
        y="8"
        width="64"
        height="84"
        rx="6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1"
        opacity="0.8"
      />
      
      {/* ECE text */}
      <text
        x="40"
        y="38"
        fontSize="18"
        fontWeight="900"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        ECE
      </text>
      
      {/* R22-05 */}
      <text
        x="40"
        y="58"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
      >
        R22-05
      </text>
      
      {/* SAFETY */}
      <text
        x="40"
        y="76"
        fontSize="9"
        fontWeight="bold"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        letterSpacing="1"
      >
        SAFETY
      </text>
      
      {/* STANDARD */}
      <text
        x="40"
        y="88"
        fontSize="9"
        fontWeight="bold"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        letterSpacing="1"
      >
        STANDARD
      </text>
    </svg>
  );
}

export function CertificateBadge({ type, size = "default" }) {
  if (!type) return null;
  
  if (type === 'DOT') {
    return <DotCertificate size={size} />;
  }
  if (type === 'ECE') {
    return <EceCertificate size={size} />;
  }
  return null;
}
