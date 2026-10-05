import type { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow text-slate-500">{label}</p>
        <p className="tabular mt-2 font-display text-5xl font-extrabold leading-none text-ink">{value}</p>
        {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
      </div>
      {icon && <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">{icon}</div>}
    </div>
  );
}
