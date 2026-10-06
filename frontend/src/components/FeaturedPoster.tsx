import { ArrowRight, CalendarClock, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNow } from '../hooks/useNow';
import { FEATURED, featuredIsLive } from '../lib/featured';
import { formatCountdown, formatMatchDate } from '../lib/format';

interface Props {
  to: string;
  cta: string;
}

/** Poster banner for the featured fixture; renders nothing once the game is over. */
export default function FeaturedPoster({ to, cta }: Props) {
  const now = useNow(30000);
  if (!featuredIsLive(now)) return null;
  const startsIn = new Date(FEATURED.startsAt).getTime() - now;
  const [teamA, teamB] = FEATURED.teams;

  return (
    <section
      className="floodlit overflow-hidden rounded-3xl text-white shadow-lift sm:grid sm:grid-cols-[minmax(0,260px)_1fr]"
      aria-label={`${FEATURED.title}: ${teamA} vs ${teamB}`}
    >
      <Link to={to} className="block bg-white">
        <img
          src={FEATURED.image}
          alt={`${FEATURED.eyebrow} ${FEATURED.title} poster: ${teamA} vs ${teamB}, ${formatMatchDate(FEATURED.startsAt)}`}
          className="mx-auto max-h-80 w-full object-contain sm:h-full sm:max-h-none"
          width={1080}
          height={1231}
          loading="lazy"
        />
      </Link>
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
        <p className="eyebrow text-lime">{FEATURED.eyebrow}</p>
        <h2 className="display text-5xl sm:text-6xl">{FEATURED.title}</h2>
        <p className="font-display text-xl font-bold uppercase sm:text-2xl">
          {teamA} <span className="text-lime">vs</span> {teamB}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {formatMatchDate(FEATURED.startsAt)}
          </span>
          <span>{FEATURED.format}</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={to} className="btn-lime px-6 py-3">
            {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-bold text-gold">
            <Timer className="h-4 w-4" aria-hidden="true" />
            {startsIn > 0 ? `Starts in ${formatCountdown(startsIn)}` : 'Live now'}
          </span>
        </div>
      </div>
    </section>
  );
}
