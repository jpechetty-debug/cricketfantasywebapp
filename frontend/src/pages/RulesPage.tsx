import { Crown, Hand, Shield, Swords, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';

// Mirrors RULES in backend/app/services/fantasy_points.py and the multipliers in scoring.py; update both together.
const BATTING: [string, string][] = [
  ['Every run', '+1'],
  ['Every four (bonus)', '+1'],
  ['Every six (bonus)', '+2'],
  ['30+ runs', '+4'],
  ['Half-century (50+)', '+8'],
  ['Century (100+)', '+16'],
  ['Out for a duck (0)', '−2'],
];
const BOWLING: [string, string][] = [
  ['Every wicket', '+25'],
  ['Bowled or LBW (bonus)', '+8'],
  ['3 wickets', '+4'],
  ['4 wickets', '+8'],
  ['5+ wickets', '+16'],
  ['Every maiden over', '+12'],
];
const FIELDING: [string, string][] = [
  ['Every catch', '+8'],
  ['3+ catches (bonus)', '+4'],
  ['Every stumping', '+12'],
  ['Every run-out', '+6'],
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Fantasy rules" title="How points work" subtitle="Your 7 players earn points from what they do in the real match." />

      <section className="floodlit rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <ol className="grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Pick 7">
            Choose 7 players from both teams, with at most 4 from one team, before the match starts.
          </Step>
          <Step n={2} title="Choose C and VC">
            Your captain scores <strong className="text-lime">2×</strong> points and your vice-captain <strong className="text-lime">1.5×</strong>.
          </Step>
          <Step n={3} title="Watch them score">
            After the match, points come from the official CricHeroes scorecard and the leaderboard updates.
          </Step>
        </ol>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <RuleCard icon={<Swords className="h-5 w-5" />} title="Batting" rows={BATTING} note="Only the highest milestone counts: 55 runs gets +8, not +4 and +8. Not out on 0 is not a duck." />
        <RuleCard icon={<Target className="h-5 w-5" />} title="Bowling" rows={BOWLING} note="Only the highest wicket bonus counts. Run-outs are not the bowler's wicket." />
        <RuleCard icon={<Hand className="h-5 w-5" />} title="Fielding" rows={FIELDING} />
        <RuleCard
          icon={<Shield className="h-5 w-5" />}
          title="Every player"
          rows={[
            ['In the playing XI', '+4'],
            ['Captain', '2× points'],
            ['Vice-captain', '1.5× points'],
          ]}
          note="Super overs are not counted. Strike rate, economy and extras don't score."
        />
      </div>

      <section className="card">
        <h2 className="display flex items-center gap-2 text-2xl">
          <Crown className="h-5 w-5 text-gold" aria-hidden="true" /> Example
        </h2>
        <p className="mt-2 text-sm text-slate-600">A batter scores 97 runs with 11 fours and takes 1 wicket, bowled:</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <Line label="Playing XI" value="4" />
          <Line label="97 runs" value="97" />
          <Line label="11 fours" value="11" />
          <Line label="Half-century" value="8" />
          <Line label="1 wicket" value="25" />
          <Line label="Bowled bonus" value="8" />
        </ul>
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <Line label="Player's points" value="153" strong />
          <Line label="As your captain (2×)" value="306" strong lime />
          <Line label="As your vice-captain (1.5×)" value="229.5" strong />
        </div>
      </section>

      <p className="pb-4 text-center text-sm text-slate-500">
        Ready?{' '}
        <Link to="/matches" className="font-bold text-pitch-700 hover:text-pitch-900">
          Pick your 7
        </Link>
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime font-display text-lg font-extrabold text-ink">{n}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-slate-300">{children}</p>
      </div>
    </li>
  );
}

function RuleCard({ icon, title, rows, note }: { icon: ReactNode; title: string; rows: [string, string][]; note?: string }) {
  return (
    <section className="card min-w-0 p-0">
      <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-display text-xl font-extrabold uppercase text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      <dl className="divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
            <dt className="font-medium text-slate-600">{label}</dt>
            <dd className={`tabular shrink-0 font-display text-lg font-extrabold ${value.startsWith('−') ? 'text-ball' : 'text-ink'}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{note}</p>}
    </section>
  );
}

function Line({ label, value, strong = false, lime = false }: { label: string; value: string; strong?: boolean; lime?: boolean }) {
  return (
    <li className="flex justify-between gap-3 list-none">
      <span className={strong ? 'font-bold text-ink' : 'text-slate-600'}>{label}</span>
      <span className={`tabular font-display text-base font-extrabold ${lime ? 'rounded bg-lime px-1.5 text-ink' : 'text-ink'}`}>{value}</span>
    </li>
  );
}
