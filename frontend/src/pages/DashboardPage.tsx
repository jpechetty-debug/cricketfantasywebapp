import { ArrowRight, BookOpen, Medal, Shield, Swords, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnnouncementCard from '../components/AnnouncementCard';
import FeaturedPoster from '../components/FeaturedPoster';
import MatchCard from '../components/MatchCard';
import { CardSkeleton, RowSkeleton } from '../components/Skeleton';
import { Avatar, EmptyState, RankBadge, SectionTitle } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { findFeaturedMatch } from '../lib/featured';
import { formatPoints, isMatchEditable } from '../lib/format';
import { apiError, leaderboardApi, matchApi, teamApi } from '../services/api';
import type { FantasyTeam, LeaderboardEntry, Match } from '../types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { auth } = useAuth();
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [boardMatch, setBoardMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [matchList, myTeams] = await Promise.all([matchApi.list(), teamApi.mine()]);
        setMatches(matchList);
        setTeams(myTeams);
        const latest = matchList.find((m) => m.status !== 'open') ?? matchList[0];
        if (latest) {
          setBoardMatch(latest);
          setBoard(await leaderboardApi.get(latest.id));
        }
      } catch (err) {
        notify(apiError(err, 'Could not load dashboard'), 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [notify]);

  const teamByMatch = useMemo(() => new Map(teams.map((t) => [t.match_id, t])), [teams]);
  const openMatches = useMemo(
    () => matches.filter((m) => isMatchEditable(m)).sort((a, b) => a.match_date.localeCompare(b.match_date)),
    [matches],
  );
  const nextMatch = openMatches[0];
  const otherOpen = openMatches.slice(1, 4);
  const bestScore = teams.reduce((best, t) => Math.max(best, t.total_points), 0);
  const myRow = board.find((r) => r.user_id === auth?.userId);
  const firstName = auth?.name?.split(' ')[0] ?? '';
  const featured = findFeaturedMatch(matches);
  const featuredLink = featured
    ? {
        to: `/match/${featured.id}`,
        cta: !isMatchEditable(featured) ? 'View match' : teamByMatch.has(featured.id) ? 'Edit your squad' : 'Pick your 7',
      }
    : { to: '/matches', cta: 'See matches' };

  return (
    <div className="space-y-10">
      <AnnouncementCard />

      {/* Hero */}
      <section className="floodlit relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow text-lime">{greeting()}</p>
            <h1 className="display mt-1 text-5xl sm:text-6xl">{firstName}</h1>
            <p className="mt-2 max-w-md text-sm font-medium text-slate-300">
              {nextMatch
                ? teamByMatch.has(nextMatch.id)
                  ? 'Your squad is in for the next match. You can still tweak it before it locks.'
                  : 'A match is open. Pick your 7 before it locks.'
                : 'No open matches right now. Check back when the next fixture is announced.'}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Squads', value: loading ? '–' : String(teams.length), icon: Shield },
              { label: 'Best score', value: loading ? '–' : formatPoints(bestScore), icon: Medal },
              { label: 'Last rank', value: loading ? '–' : myRow ? `#${myRow.rank}` : '—', icon: Trophy },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/10">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Icon className="h-3 w-3" aria-hidden="true" /> {label}
                </dt>
                <dd className="tabular mt-1 font-display text-3xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {!loading && <FeaturedPoster to={featuredLink.to} cta={featuredLink.cta} />}

      <Link to="/rules" className="card-interactive group flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">How points work</p>
          <p className="text-sm text-slate-500">1 run = 1 point, wicket = 25, catch = 8. Captain 2×, vice-captain 1.5×.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>

      {/* Next match */}
      <section>
        <SectionTitle
          title="Up next"
          action={
            <Link to="/matches" className="flex items-center gap-1 text-sm font-bold text-pitch-700 hover:text-pitch-900">
              All matches <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : !nextMatch ? (
          <EmptyState icon={<Swords className="h-6 w-6" />} title="No open matches" body="The organiser hasn't opened the next fixture yet." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <MatchCard match={nextMatch} featured myPoints={teamByMatch.get(nextMatch.id)?.total_points ?? null} />
            {otherOpen.map((m) => (
              <MatchCard key={m.id} match={m} myPoints={teamByMatch.get(m.id)?.total_points ?? null} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle
            title="My squads"
            action={
              <Link to="/my-teams" className="flex items-center gap-1 text-sm font-bold text-pitch-700 hover:text-pitch-900">
                See all <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          {loading ? (
            <RowSkeleton rows={3} />
          ) : teams.length === 0 ? (
            <EmptyState icon={<Shield className="h-6 w-6" />} title="No squads yet" body="Open a match and pick 7 players to get on the board." />
          ) : (
            <ul className="card divide-y divide-slate-100 p-0">
              {teams.slice(0, 4).map((team) => (
                <li key={team.id}>
                  <Link to={`/match/${team.match_id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">
                      <Shield className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{team.match_name || `Match #${team.match_id}`}</p>
                      <p className="text-xs font-medium text-slate-500">7 players · C &amp; VC set</p>
                    </div>
                    <p className="tabular font-display text-2xl font-extrabold text-ink">
                      {formatPoints(team.total_points)}
                      <span className="ml-0.5 text-xs font-bold text-slate-400">pts</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionTitle
            title="Top of the table"
            action={
              <Link
                to={boardMatch ? `/leaderboard?match=${boardMatch.id}` : '/leaderboard'}
                className="flex items-center gap-1 text-sm font-bold text-pitch-700 hover:text-pitch-900"
              >
                Full table <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          {loading ? (
            <RowSkeleton rows={5} />
          ) : board.length === 0 ? (
            <EmptyState icon={<Trophy className="h-6 w-6" />} title="Board is empty" body="Rankings show up once squads are entered." />
          ) : (
            <div className="card p-0">
              {boardMatch && <p className="border-b border-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{boardMatch.match_name}</p>}
              <ol className="divide-y divide-slate-100">
                {board.slice(0, 5).map((row) => (
                  <li key={row.team_id} className={`flex items-center gap-3 px-5 py-3 ${row.user_id === auth?.userId ? 'bg-pitch-50/70' : ''}`}>
                    <RankBadge rank={row.rank} />
                    <Avatar name={row.name} className="h-8 w-8 text-[11px]" />
                    <p className="min-w-0 flex-1 truncate font-bold text-ink">{row.name}</p>
                    <p className="tabular font-display text-xl font-extrabold">{formatPoints(row.points)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
