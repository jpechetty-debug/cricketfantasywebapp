import { Maximize2, Users } from 'lucide-react';
import { useState } from 'react';
import { FEATURED } from '../lib/featured';
import Modal from './Modal';

/** The organiser's playing-squads graphic: a compact card that opens the full image. */
export default function AnnouncedSquads() {
  const [open, setOpen] = useState(false);
  const src = FEATURED.squadsImage;
  if (!src) return null;
  const alt = `Announced squads for ${FEATURED.title}: ${FEATURED.teams.join(' vs ')}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 pr-4 text-left transition hover:border-pitch-500 hover:shadow-sm"
      >
        <img src={src} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover object-top" width={64} height={80} loading="lazy" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-display text-lg font-extrabold uppercase text-ink">
            <Users className="h-4 w-4 text-pitch-600" aria-hidden="true" /> Announced squads
          </span>
          <span className="mt-0.5 block text-sm text-slate-500">See who's playing for both teams before you pick your 7.</span>
        </span>
        <Maximize2 className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-pitch-600" aria-hidden="true" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Announced squads" wide>
        <img src={src} alt={alt} className="mx-auto w-full rounded-xl" width={1080} height={1341} />
      </Modal>
    </>
  );
}
