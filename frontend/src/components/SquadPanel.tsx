import { Check, Circle, X } from 'lucide-react';
import { formatPoints, initials } from '../lib/format';
import { SQUAD_SIZE, sortSquad } from '../lib/squad';
import type { Player } from '../types';

// Fielding positions (percent of the field box) for the 7 squad slots.
const SLOTS = [
  { x: 50, y: 11 },
  { x: 20, y: 30 },
  { x: 80, y: 30 },
  { x: 50, y: 50 },
  { x: 20, y: 70 },
  { x: 80, y: 70 },
  { x: 50, y: 89 },
];

interface Props {
  players: Player[];
  captain: number | null;
  vice: number | null;
  readOnly: boolean;
  points: Record<number, number> | null;
  teamA: string;
  teamB: string;
  onCaptain: (id: number) => void;
  onVice: (id: number) => void;
  onRemove: (id: number) => void;
}

export default function SquadPanel({ players, captain, vice, readOnly, points, teamA, teamB, onCaptain, onVice, onRemove }: Props) {
  const squad = sortSquad(players);
  const fromA = players.filter((p) => p.team_name === teamA).length;
  const fromB = players.filter((p) => p.team_name === teamB).length;

  const checks = [
    { done: players.length === SQUAD_SIZE, label: `${SQUAD_SIZE} players picked` },
    { done: captain !== null, label: 'Captain chosen (2×)' },
    { done: vice !== null, label: 'Vice-captain chosen (1.5×)' },
  ];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="tabular font-display text-3xl font-extrabold text-ink">
            {players.length}
            <span className="text-slate-300">/{SQUAD_SIZE}</span>
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {teamA} <span className="tabular font-bold text-ink">{fromA}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            {teamB} <span className="tabular font-bold text-ink">{fromB}</span>
          </p>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: SQUAD_SIZE }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < players.length ? 'bg-pitch-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      {/* Field */}
      <div className="turf relative mx-auto aspect-[5/6] w-full max-w-[340px] overflow-hidden rounded-[46%/40%] ring-4 ring-pitch-700/30">
        <div className="absolute inset-[7%] rounded-[46%/40%] border border-white/25" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 h-[30%] w-[11%] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#d9c58f]/85" aria-hidden="true" />
        {SLOTS.map((slot, i) => {
          const p = squad[i];
          return (
            <div
              key={i}
              className="absolute flex w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              {p ? (
                <>
                  <span className="relative">
                    <span className="flex h-11 w-11 animate-pop items-center justify-center rounded-full bg-white font-display text-sm font-extrabold text-ink shadow-md">
                      {initials(p.player_name)}
                    </span>
                    {(p.id === captain || p.id === vice) && (
                      <span
                        className={`absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black ring-2 ring-white ${
                          p.id === captain ? 'bg-ball text-white' : 'bg-gold text-ink'
                        }`}
                      >
                        {p.id === captain ? 'C' : 'VC'}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 max-w-full truncate rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {p.player_name}
                  </span>
                </>
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-xs font-bold text-white/70">
                  {i + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Captain picker / points breakdown */}
      {squad.length > 0 && (
        <div>
          {!readOnly && (
            <p className="mb-2 text-xs font-medium text-slate-500">
              Tap <span className="font-bold text-ball">C</span> for captain (2× points) and{' '}
              <span className="font-bold text-amber-600">VC</span> for vice-captain (1.5×).
            </p>
          )}
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {squad.map((p) => {
              const base = points?.[p.id];
              const mult = p.id === captain ? 2 : p.id === vice ? 1.5 : 1;
              return (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.player_name}</p>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {p.role} · {p.team_name}
                    </p>
                  </div>
                  {readOnly ? (
                    <>
                      {mult > 1 && (
                        <span className={`chip px-1.5 py-0.5 text-[10px] ${p.id === captain ? 'bg-ball text-white' : 'bg-gold text-ink'}`}>
                          {p.id === captain ? 'C' : 'VC'} {mult}×
                        </span>
                      )}
                      {points && (
                        <span className="tabular w-14 text-right font-display text-lg font-extrabold text-ink">
                          {formatPoints((base ?? 0) * mult)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onCaptain(p.id)}
                        aria-pressed={p.id === captain}
                        aria-label={`Make ${p.player_name} captain`}
                        className={`h-8 w-9 rounded-lg text-xs font-black transition ${
                          p.id === captain ? 'bg-ball text-white shadow-sm' : 'border border-slate-200 text-slate-500 hover:border-ball hover:text-ball'
                        }`}
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => onVice(p.id)}
                        aria-pressed={p.id === vice}
                        aria-label={`Make ${p.player_name} vice-captain`}
                        className={`h-8 w-9 rounded-lg text-xs font-black transition ${
                          p.id === vice ? 'bg-gold text-ink shadow-sm' : 'border border-slate-200 text-slate-500 hover:border-gold hover:text-amber-600'
                        }`}
                      >
                        VC
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        aria-label={`Remove ${p.player_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-ball-soft hover:text-ball"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!readOnly && (
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 text-sm font-semibold ${c.done ? 'text-pitch-700' : 'text-slate-400'}`}>
              {c.done ? (
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
