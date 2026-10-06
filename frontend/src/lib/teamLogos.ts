// Team logos in /public/teams, matched on the team name with spacing, case and suffixes like "11" or "XI" ignored.
const LOGOS: { key: string; src: string; bg: string }[] = [
  { key: 'bachpanamigos', src: '/teams/bachpan-amigos.webp', bg: '#ffefd6' },
  { key: 'smashingsharks', src: '/teams/smashing-sharks.webp', bg: '#ffffff' },
];

export function teamLogo(name: string) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return LOGOS.find((logo) => key.startsWith(logo.key)) ?? null;
}
