import { Star, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { ANNOUNCEMENT, announcementIsLive } from '../lib/announcement';
import { formatPoints } from '../lib/format';

const STORAGE_KEY = `announcement-dismissed:${ANNOUNCEMENT.id}`;

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Thank-you note for every member; each person can close it, and it expires on its own. */
export default function AnnouncementCard() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden || !announcementIsLive()) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode or blocked storage: it just shows again next visit.
    }
  }

  return (
    <section className="floodlit relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-8" aria-label={ANNOUNCEMENT.title}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Close message"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="eyebrow text-lime">{ANNOUNCEMENT.eyebrow}</p>
      <h2 className="display mt-1 pr-8 text-4xl sm:text-5xl">{ANNOUNCEMENT.title}</h2>
      <div className="mt-3 max-w-2xl space-y-2 text-sm font-medium text-slate-300">
        {ANNOUNCEMENT.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
            <Trophy className="h-3 w-3" aria-hidden="true" /> Fantasy winners
          </p>
          <ol className="mt-2 space-y-1.5">
            {ANNOUNCEMENT.winners.map((w) => (
              <li key={w.place} className="flex items-baseline gap-3">
                <span className="w-8 text-xs font-bold text-slate-400">{w.place}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{w.name}</span>
                <span className="tabular font-display text-lg font-extrabold text-lime">{formatPoints(w.points)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Star className="h-3 w-3" aria-hidden="true" /> Top fantasy performers
          </p>
          <ol className="mt-2 space-y-1.5">
            {ANNOUNCEMENT.performers.map((p) => (
              <li key={p.name} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <span className="tabular font-display text-lg font-extrabold">{formatPoints(p.points)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-200">{ANNOUNCEMENT.signOff}</p>
    </section>
  );
}
