import type { Player } from '../types';

export const SQUAD_SIZE = 7;
// Keeps squads balanced across the two sides; the server enforces the same limit.
export const MAX_PER_TEAM = 4;

const ROLE_ORDER: Record<string, number> = { WK: 0, BAT: 1, AR: 2, BOWL: 3 };

export function sortSquad(players: Player[]) {
  return [...players].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
}

export function teamTotal(players: Player[], captain: number | null, vice: number | null, points: Record<number, number>) {
  return players.reduce((sum, p) => {
    const base = points[p.id] ?? 0;
    return sum + base * (p.id === captain ? 2 : p.id === vice ? 1.5 : 1);
  }, 0);
}
