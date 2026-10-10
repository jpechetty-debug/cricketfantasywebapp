/** Message shown to every member on the dashboard. Change `id` for a new message so it shows again for people who closed the last one. */
export const ANNOUNCEMENT = {
  id: 'celebration-cup-final-thanks',
  eyebrow: 'Celebration Cup · 75 Matches',
  title: 'Thank you for playing!',
  body: [
    'A big thank you to all 29 of you who picked a squad for the 75 Match Celebration Cup final, BachpanAmigos 11 vs Smashing Sharks. Your picks and your banter made the final even more fun to follow.',
    'Congratulations to Smashing Sharks, who defended 136 and won by 12 runs, and well played BachpanAmigos 11 for taking it right to the end.',
  ],
  winners: [
    { place: '1st', name: 'Mahesh', points: 534.5 },
    { place: '2nd', name: 'Raghunandan', points: 498.5 },
    { place: '3rd', name: 'Suprabhat', points: 461 },
  ],
  performers: [
    { name: 'Vijayavardhan G', points: 79 },
    { name: 'Raja', points: 70 },
    { name: 'K V Vijay', points: 67 },
  ],
  signOff: 'Congratulations to our winners, and thank you to everyone who took part. See you all in the next match!',
  // The card disappears on its own after this.
  hideAfter: '2026-10-18T23:59:00+05:30',
};

export function announcementIsLive(now = Date.now()) {
  return now < new Date(ANNOUNCEMENT.hideAfter).getTime();
}
