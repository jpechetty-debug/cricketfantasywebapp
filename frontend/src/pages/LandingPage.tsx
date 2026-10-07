import { ArrowRight, Crown, ListChecks, PenLine, Trophy } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import FeaturedPoster from '../components/FeaturedPoster';
import { Logo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const STEPS = [
  { icon: ListChecks, title: 'Pick 7 players', body: 'Choose from both sides of the fixture, with at most 4 from one team. Any mix of batters, bowlers and all-rounders.' },
  { icon: Crown, title: 'Back your captain', body: 'Captain earns 2× points, vice-captain 1.5×. That call usually decides the league.' },
  { icon: PenLine, title: 'Scored from the scorecard', body: 'After the game, points come straight from the official CricHeroes scorecard. Nobody can fiddle them.' },
  { icon: Trophy, title: 'Climb the table', body: 'The leaderboard updates instantly. Bragging rights until the next Sunday.' },
];

// Mirrors RULES in backend/app/services/fantasy_points.py (see also RulesPage); update together.
const SCORING = [
  { icon: '🏏', value: '1', label: 'Per run', tone: 'bg-lime/30 text-ink' },
  { icon: '🎯', value: '+1', label: 'Per four', tone: 'bg-sky-100 text-sky-900' },
  { icon: '🚀', value: '+2', label: 'Per six', tone: 'bg-violet-100 text-violet-900' },
  { icon: '🔥', value: '25', label: 'Wicket', tone: 'bg-rose-100 text-rose-900' },
  { icon: '🙌', value: '8', label: 'Catch', tone: 'bg-amber-100 text-amber-900' },
  { icon: '⚡', value: '12', label: 'Stumping', tone: 'bg-emerald-100 text-emerald-900' },
];

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="floodlit overflow-hidden text-white">
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
              <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Local cricket, now with a fantasy experience
            </p>
            <h1 className="display text-6xl sm:text-7xl lg:text-8xl">
              Pick 7.
              <br />
              Back your <span className="text-lime">captain.</span>
              <br />
              Own the fantasy.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
              Make your weekend cricket more than just a match.
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

          {/* Points cheat-sheet */}
          <div className="relative mx-auto w-full max-w-sm animate-slide-up [animation-delay:120ms]">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-lime/10 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-3xl bg-white p-5 text-ink shadow-lift">
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl font-extrabold uppercase leading-none">How you score</p>
                <span className="chip bg-lime text-ink">Points</span>
              </div>
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {SCORING.map((s) => (
                  <li key={s.label} className={`flex flex-col items-center rounded-2xl px-1 py-3 text-center ${s.tone}`}>
                    <span className="text-xl leading-none" aria-hidden="true">
                      {s.icon}
                    </span>
                    <span className="tabular mt-1.5 font-display text-2xl font-extrabold leading-none">{s.value}</span>
                    <span className="mt-1 text-[11px] font-bold uppercase tracking-wide opacity-80">{s.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-2xl bg-ball px-3 py-2.5 text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black text-ball">C</span>
                  <span className="font-display text-2xl font-extrabold">2×</span>
                  <span className="text-[11px] font-bold uppercase leading-tight opacity-90">Captain</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-gold px-3 py-2.5 text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-black text-gold">VC</span>
                  <span className="font-display text-2xl font-extrabold">1.5×</span>
                  <span className="text-[11px] font-bold uppercase leading-tight opacity-80">Vice</span>
                </div>
              </div>
              <p className="mt-3 rounded-2xl bg-ink px-4 py-3 text-center text-xs font-semibold text-slate-300">
                <span className="text-lime">+4</span> for every player in the XI · bonuses at <span className="text-lime">30, 50 & 100</span> runs
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-lime text-ink" aria-label="You play the match, we make it a fantasy">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:py-12">
          <p className="display text-4xl leading-[0.95] sm:text-5xl">
            <span aria-hidden="true">🏏 </span>You play the match. <br className="sm:hidden" />
            <span aria-hidden="true">🔥 </span>We make it a fantasy.
          </p>
        </div>
      </section>

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

      <section className="floodlit text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-16">
          <h2 className="display text-4xl sm:text-5xl">
            Your players. Your teams. <span className="text-lime">Your league.</span>
          </h2>
          <Link to="/register" className="btn-lime shrink-0 px-7 py-3.5 text-base">
            Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
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
