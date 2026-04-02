interface ScoreBarProps {
  score: number; // 0-100
  size?: 'sm' | 'md';
}

export default function ScoreBar({ score, size = 'md' }: ScoreBarProps) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-400';
  const h = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${h} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`${h} ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-text-muted w-8 text-right">{score}%</span>
    </div>
  );
}
