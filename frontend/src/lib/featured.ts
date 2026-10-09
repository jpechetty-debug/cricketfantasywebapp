import type { Match } from '../types';

/** The match currently promoted with a poster. Swap these values (and the image in /public) for the next big game. */
export const FEATURED = {
  image: '/final-poster.webp',
  // Announced playing squads, shown on the match page while people pick. Set to null if not out yet.
  squadsImage: '/final-squads.webp' as string | null,
  eyebrow: 'Celebration Cup · 75 Matches',
  title: 'The Final',
  teams: ['Smashing Sharks', 'BachpanAmigos 11'] as const,
  format: '20-over match',
  startsAt: '2026-10-10T18:00:00+05:30',
  // Keep the banner up for the evening of the game, then it disappears on its own.
  hideAfterHours: 6,
};

const key = (name: string) => name.toLowerCase().replace(/[^0-9a-z]/g, '');

export function featuredIsLive(now = Date.now()) {
  return now < new Date(FEATURED.startsAt).getTime() + FEATURED.hideAfterHours * 3_600_000;
}

/** True when the match is between the two featured teams (spacing and case ignored). */
export function isFeaturedMatch(match: Pick<Match, 'team_a' | 'team_b'>) {
  const wanted = new Set(FEATURED.teams.map(key));
  return wanted.has(key(match.team_a)) && wanted.has(key(match.team_b));
}

/** The app match for the featured fixture: same two teams (spacing and case ignored), closest to the poster's date. */
export function findFeaturedMatch(matches: Match[]): Match | undefined {
  const start = new Date(FEATURED.startsAt).getTime();
  return matches
    .filter(isFeaturedMatch)
    .sort((a, b) => Math.abs(new Date(a.match_date).getTime() - start) - Math.abs(new Date(b.match_date).getTime() - start))[0];
}
