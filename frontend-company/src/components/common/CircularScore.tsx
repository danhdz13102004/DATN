import { useEffect, useState } from 'react';

interface CircularScoreProps {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export default function CircularScore({
  score,
  size = 44,
  showLabel = true,
  className = '',
}: CircularScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const pct = Math.round(score * 100);
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const [fill, setFill] = useState(0);

  // Determine color based on score
  const getColor = (pct: number) => {
    if (pct >= 80) return { stroke: '#10b981', text: '#059669' }; // emerald
    if (pct >= 60) return { stroke: '#f59e0b', text: '#d97706' }; // amber
    return { stroke: '#ef4444', text: '#dc2626' }; // red
  };

  const colors = getColor(pct);

  // Animate on mount
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedScore(Math.round(eased * pct));
      setFill((eased * pct / 100) * circ);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [pct, circ]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.05s linear' }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color: colors.text }}
        >
          {animatedScore}
        </span>
      )}
    </div>
  );
}
