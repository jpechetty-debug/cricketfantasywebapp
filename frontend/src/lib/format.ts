import type { Match } from '../types';

export function formatMatchDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** "2d 4h", "3h 12m", "45m" — coarse, human countdown. */
export function formatCountdown(ms: number) {
  if (ms <= 0) return 'now';
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(mins, 1)}m`;
}

/** Mirrors the backend rule: a match accepts team edits while open and before its start time. */
export function isMatchEditable(match: Match, now = Date.now()) {
  return match.status === 'open' && new Date(match.match_date).getTime() > now;
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const TEAM_PALETTE = [
  { bg: '#0b8a4f', fg: '#ffffff' },
  { bg: '#d7263d', fg: '#ffffff' },
  { bg: '#1d4ed8', fg: '#ffffff' },
  { bg: '#f5b700', fg: '#0b1220' },
  { bg: '#7c3aed', fg: '#ffffff' },
  { bg: '#0891b2', fg: '#ffffff' },
  { bg: '#ea580c', fg: '#ffffff' },
  { bg: '#0b1220', fg: '#c6f432' },
];

/** Stable colour per team name so a team looks the same everywhere. */
export function teamColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TEAM_PALETTE[hash % TEAM_PALETTE.length];
}

export const ROLE_LABELS: Record<string, string> = {
  WK: 'Wicket-keeper',
  BAT: 'Batter',
  AR: 'All-rounder',
  BOWL: 'Bowler',
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Natural order, so "Player 2" sorts before "Player 10". */
export function byPlayerName(a: { player_name: string }, b: { player_name: string }) {
  return collator.compare(a.player_name, b.player_name);
}
