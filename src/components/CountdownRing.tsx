import React from 'react';

interface CountdownRingProps {
  remainingSeconds: number;
  period: number;
  size?: number;
  strokeWidth?: number;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  remainingSeconds,
  period,
  size = 28,
  strokeWidth = 3,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / period));
  const strokeDashoffset = circumference - progress * circumference;

  // Color transition based on urgency: Cyber Green -> Amber -> Crimson
  let strokeColor = '#00FF88'; // brand cyber green
  if (remainingSeconds <= 5) {
    strokeColor = '#EF4444'; // crimson
  } else if (remainingSeconds <= 10) {
    strokeColor = '#F59E0B'; // amber
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-linear"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-neutral-300 tabular-nums">
        {remainingSeconds}
      </span>
    </div>
  );
};
