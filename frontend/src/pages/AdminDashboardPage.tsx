import { ArrowRight, ClipboardCheck, CloudDownload, PenLine, Phone, Shield, Swords, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSkeleton, RowSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { Avatar, EmptyState, PageHeader, RankBadge, SectionTitle, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate, formatPoints } from '../lib/format';
import { adminApi, apiError, matchApi } from '../services/api';
import type { AdminStats, EntryMember, Match, MatchEntries, MatchWinners } from '../types';

const ACTIONS = [
  { to: '/admin/matches', icon: Swords, title: 'Schedule a match', body: 'Create fixtures and open them for squads.' },
  { to: '/admin/players', icon: Users, title: 'Manage players', body: 'Add, edit or retire players from the pool.' },
  { to: '/admin/scoring', icon: PenLine, title: 'View points', body: 'See the points imported for each player.' },
  { to: '/admin/cricheroes', icon: CloudDownload, title: 'Import from CricHeroes', body: 'Pull fixtures, XIs and points from a scorecard.' },
];

export default function AdminDashboardPage() {
  const { notify } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<MatchWinners[]>([]);
  const [entries, setEntries] = useState<MatchEntries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.stats(), matchApi.list(), adminApi.winners(), adminApi.entries()])
      .then(([s, m, w, e]) => {
        setStats(s);
        setMatches(m);
        setResults(w);
        setEntries(e);
      })
      .catch((err) => notify(apiError(err, 'Could not load admin data'), 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Admin console" title="League overview" subtitle="Everything happening in your league at a glance." />

      {loading || !stats ? (
        <div className="grid gap-5 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard label="Players registered" value={stats.total_users} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Matches" value={stats.total_matches} icon={<Swords className="h-5 w-5" />} />
          <StatCard label="Squads entered" value={stats.total_teams} icon={<Shield className="h-5 w-5" />} />
        </div>
      )}

      <section>
        <SectionTitle title="Squad entries" />
        {loading ? (
          <RowSkeleton rows={2} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="No upcoming matches"
            body="Schedule or import a match and you will see here who has picked a squad."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {entries.map((entry) => (
              <EntriesCard key={entry.match_id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Fantasy winners"
          action={
            <Link to="/admin/matches" className="flex items-center gap-1 text-sm font-bold text-pitch-700 hover:text-pitch-900">
              Close a match <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        {loading ? (
          <RowSkeleton rows={3} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="No results yet"
            body="After a match, import the CricHeroes scorecard, then set the match to completed. Its top 3 squads appear here."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {results.map((result) => (
              <article key={result.match_id} className="card p-0">
                <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-ink">
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{result.match_name}</p>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {result.team_a} vs {result.team_b} · {formatMatchDate(result.match_date)} · {result.squads}{' '}
                      {result.squads === 1 ? 'squad' : 'squads'}
                    </p>
                  </div>
                </header>
                {result.winners.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">Nobody entered a squad for this match.</p>
                ) : (
                  <ol className="divide-y divide-slate-100">
                    {result.winners.map((w) => (
                      <li key={w.user_id} className="flex items-center gap-3 px-5 py-3">
                        <RankBadge rank={w.rank} />
                        <Avatar name={w.name} className="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink">{w.name}</p>
                          {w.mobile && (
                            <a href={`tel:${w.mobile}`} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-pitch-700">
                              <Phone className="h-3 w-3" aria-hidden="true" />
                              {w.mobile}
                            </a>
                          )}
                        </div>
                        <p className="tabular font-display text-xl font-extrabold text-ink">
                          {formatPoints(w.points)}
                          <span className="ml-0.5 text-xs font-bold text-slate-400">pts</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Quick actions" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="card-interactive group flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lime">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="flex items-center gap-1 font-bold text-ink">
                  {title}
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                </p>
                <p className="mt-1 text-sm text-slate-500">{body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Recent matches"
          action={
            <Link to="/admin/matches" className="flex items-center gap-1 text-sm font-bold text-pitch-700 hover:text-pitch-900">
              Manage <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        {loading ? (
          <RowSkeleton rows={4} />
        ) : matches.length === 0 ? (
          <EmptyState icon={<Swords className="h-6 w-6" />} title="No matches yet" body="Schedule your first fixture to get the league going." />
        ) : (
          <ul className="card divide-y divide-slate-100 p-0">
            {matches.slice(0, 6).map((match) => (
              <li key={match.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex -space-x-2">
                  <TeamCrest name={match.team_a} size="sm" />
                  <TeamCrest name={match.team_b} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{match.match_name}</p>
                  <p className="truncate text-xs font-medium text-slate-500">
                    {match.team_a} vs {match.team_b} · {formatMatchDate(match.match_date)}
                  </p>
                </div>
                <StatusBadge status={match.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EntriesCard({ entry }: { entry: MatchEntries }) {
  const [tab, setTab] = useState<'missing' | 'entered'>('missing');
  const done = entry.entered.length;
  const pct = entry.members ? Math.round((done / entry.members) * 100) : 0;
  const list = tab === 'entered' ? entry.entered : entry.missing;

  return (
    <article className="card min-w-0 p-0">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex -space-x-2">
          <TeamCrest name={entry.team_a} size="md" />
          <TeamCrest name={entry.team_b} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{entry.match_name}</p>
          <p className="truncate text-xs font-medium text-slate-500">
            {entry.team_a} vs {entry.team_b} · {formatMatchDate(entry.match_date)}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </header>

      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <p className="tabular font-display text-4xl font-extrabold text-ink">
            {done}
            <span className="text-xl text-slate-400"> / {entry.members}</span>
          </p>
          <p className="pb-1 text-sm font-semibold text-slate-500">members entered a squad · {pct}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Squads entered">
          <div className="h-full rounded-full bg-pitch-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mx-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label={`Members for ${entry.match_name}`}>
        {(
          [
            ['missing', `Not yet (${entry.missing.length})`],
            ['entered', `Entered (${done})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg py-2 text-xs font-bold transition ${tab === id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">{tab === 'missing' ? 'Everyone has entered a squad.' : 'Nobody has entered a squad yet.'}</p>
      ) : (
        <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {list.map((m) => (
            <MemberRow key={m.user_id} member={m} />
          ))}
        </ul>
      )}
    </article>
  );
}

function MemberRow({ member }: { member: EntryMember }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <Avatar name={member.name} className="h-8 w-8 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{member.name}</p>
        <a href={`tel:${member.mobile}`} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-pitch-700">
          <Phone className="h-3 w-3" aria-hidden="true" />
          {member.mobile}
        </a>
      </div>
      {member.entered_at && <p className="shrink-0 text-xs font-medium text-slate-400">{formatMatchDate(member.entered_at)}</p>}
    </li>
  );
}
