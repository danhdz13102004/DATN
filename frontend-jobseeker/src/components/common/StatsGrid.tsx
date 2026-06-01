import StatCard from './StatCard';

interface StatCardData {
  label: string;
  value: number | string;
  icon: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'indigo' | 'sky' | 'amber' | 'rose';
  change?: string;
  changeType?: 'positive' | 'negative';
  helperText?: string;
}

interface StatsGridProps {
  stats: StatCardData[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}

export type { StatCardData };
