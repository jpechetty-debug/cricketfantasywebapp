import { ArrowRight, Crown, ListChecks, PenLine, Trophy } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import FeaturedPoster from '../components/FeaturedPoster';
import { Logo, TeamCrest } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const STEPS = [
  { icon: ListChecks, title: 'Pick 7 players', body: 'Choose from both sides of the fixture, with at most 4 from one team. Any mix of batters, bowlers and all-rounders.' },
  { icon: Crown, title: 'Back your captain', body: 'Captain earns 2× points, vice-captain 1.5×. That call usually decides the league.' },
  { icon: PenLine, title: 'Scored from the scorecard', body: 'After the game, points come straight from the official CricHeroes scorecard. Nobody can fiddle them.' },
  { icon: Trophy, title: 'Climb the table', body: 'The leaderboard updates instantly. Bragging rights until the next Sunday.' },
];

const DEMO_SQUAD = [
  { n: 'R. Sharma', r: 'BAT', c: 'C' },
  { n: 'K. Rao', r: 'WK' },
  { n: 'A. Patel', r: 'AR', c: 'VC' },
  { n: 'S. Iyer', r: 'BAT' },
  { n: 'M. Khan', r: 'BOWL' },
];

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="floodlit text-white">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">Bachpan Cricket League</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn rounded-xl px-4 text-white hover:bg-white/10">
              Log in
            </Link>
            <Link to="/register" className="btn-lime">
              Join free
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-16">
          <div className="animate-slide-up">
            <p className="eyebrow mb-4 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-lime ring-1 ring-inset ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Fantasy cricket for your local league
            </p>
            <h1 className="display text-6xl sm:text-7xl lg:text-8xl">
              Pick 7.
              <br />
              Back your <span className="text-lime">captain.</span>
              <br />
              Own the fantasy.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
              Run a fantasy league for your Sunday matches. Friends pick squads, points come from the CricHeroes scorecard, and the leaderboard does the trash talk.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-lime px-7 py-3.5 text-base">
                Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/login" className="btn px-7 py-3.5 text-base text-white ring-1 ring-inset ring-white/20 hover:bg-white/10">
                I already play
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">No wallets. No ads. Just cricket and bragging rights.</p>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-sm animate-slide-up [animation-delay:120ms]" aria-hidden="true">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-lime/10 blur-2xl" />
            <div className="relative rounded-3xl bg-white p-5 text-ink shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sunday Local Derby</p>
                <span className="chip bg-pitch-50 text-pitch-700 ring-1 ring-inset ring-pitch-200">Open</span>
              </div>
              <div className="my-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TeamCrest name="Royal Strikers" size="md" />
                  <span className="font-display text-lg font-bold uppercase">Strikers</span>
                </div>
                <span className="font-display text-sm font-extrabold text-slate-400">VS</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold uppercase">Warriors</span>
                  <TeamCrest name="Gully Warriors" size="md" />
                </div>
              </div>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {DEMO_SQUAD.map((p) => (
                  <li key={p.n} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-display text-xs font-extrabold">
                      {p.n.split(' ')[1].slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm font-bold">{p.n}</span>
                    <span className="text-[11px] font-bold text-slate-400">{p.r}</span>
                    {p.c && (
                      <span className={`chip px-1.5 py-0 text-[10px] ${p.c === 'C' ? 'bg-ball text-white' : 'bg-gold text-ink'}`}>{p.c}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
                <span className="tabular font-display text-2xl font-extrabold">
                  5<span className="text-slate-500">/7</span>
                </span>
                <span className="text-xs font-bold text-lime">Locks in 1d 4h</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-12 empty:hidden lg:pt-16">
        <FeaturedPoster to="/register" cta="Join and pick your 7" />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <p className="eyebrow text-pitch-600">How it works</p>
        <h2 className="display mt-2 text-4xl sm:text-5xl">Four steps to the top of the table</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="card relative">
              <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-slate-100">{i + 1}</span>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="relative mt-4 font-bold text-ink">{title}</p>
              <p className="relative mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Bachpan Cricket League</p>
          <Link to="/admin/login" className="font-semibold hover:text-ink">
            Organiser login
          </Link>
        </div>
      </footer>
    </div>
  );
}
