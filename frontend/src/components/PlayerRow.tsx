import { Check, Plus } from 'lucide-react';
import { ROLE_LABELS, formatPoints } from '../lib/format';
import type { Player } from '../types';
import { TeamCrest } from './ui';

interface Props {
  player: Player;
  selected: boolean;
  disabled: boolean;
  readOnly: boolean;
  points?: number;
  badge?: 'C' | 'VC' | null;
  onToggle: () => void;
}

export default function PlayerRow({ player, selected, disabled, readOnly, points, badge, onToggle }: Props) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={readOnly || disabled}
        aria-pressed={selected}
        className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5 ${
          selected ? 'bg-pitch-50/70' : 'hover:bg-slate-50'
        } ${disabled && !selected ? 'opacity-45' : ''} ${readOnly ? 'cursor-default' : ''}`}
      >
        <TeamCrest name={player.team_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-bold text-ink">
            {player.player_name}
            {badge && (
              <span className={`chip px-1.5 py-0 text-[10px] ${badge === 'C' ? 'bg-ball text-white' : 'bg-gold text-ink'}`}>{badge}</span>
            )}
          </p>
          <p className="truncate text-xs font-medium text-slate-500">
            {ROLE_LABELS[player.role] ?? player.role} · {player.team_name}
          </p>
        </div>
        {points !== undefined && (
          <span className="tabular font-display text-lg font-extrabold text-ink">
            {formatPoints(points)}
            <span className="ml-0.5 text-xs font-bold text-slate-400">pts</span>
          </span>
        )}
        {!readOnly && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
              selected
                ? 'animate-pop border-pitch-600 bg-pitch-600 text-white'
                : 'border-slate-200 text-slate-400 group-hover:border-pitch-500 group-hover:text-pitch-600'
            }`}
            aria-hidden="true"
          >
            {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} />}
          </span>
        )}
      </button>
    </li>
  );
}
