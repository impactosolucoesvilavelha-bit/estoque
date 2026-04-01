import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  subtitle?: string;
  /** Se definido, o card inteiro vira link (dashboard → aba correspondente). */
  to?: string;
}

const colors = {
  blue: 'bg-blue-600/20 text-blue-400 border-blue-800/40',
  emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-800/40',
  amber: 'bg-amber-600/20 text-amber-400 border-amber-800/40',
  rose: 'bg-rose-600/20 text-rose-400 border-rose-800/40',
  violet: 'bg-violet-600/20 text-violet-400 border-violet-800/40',
};

const iconColors = {
  blue: 'bg-blue-600/30 text-blue-300',
  emerald: 'bg-emerald-600/30 text-emerald-300',
  amber: 'bg-amber-600/30 text-amber-300',
  rose: 'bg-rose-600/30 text-rose-300',
  violet: 'bg-violet-600/30 text-violet-300',
};

export function StatCard({ title, value, icon, color, subtitle, to }: StatCardProps) {
  const cardClass = `rounded-2xl border p-5 ${colors[color]} bg-slate-900/80 ${
    to ? 'hover:brightness-110 active:scale-[0.99] cursor-pointer transition-all duration-150' : ''
  }`;

  const inner = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
        {icon}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`block ${cardClass}`}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}
