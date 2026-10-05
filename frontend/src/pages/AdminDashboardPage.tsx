import { ArrowRight, PenLine, Shield, Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSkeleton, RowSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, PageHeader, SectionTitle, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate } from '../lib/format';
import { adminApi, apiError, matchApi } from '../services/api';
import type { AdminStats, Match } from '../types';

const ACTIONS = [
  { to: '/admin/matches', icon: Swords, title: 'Schedule a match', body: 'Create fixtures and open them for squads.' },
  { to: '/admin/players', icon: Users, title: 'Manage players', body: 'Add, edit or retire players from the pool.' },
  { to: '/admin/scoring', icon: PenLine, title: 'Enter points', body: 'Score a match and update the leaderboard.' },
];

export default function AdminDashboardPage() {
  const { notify } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.stats(), matchApi.list()])
      .then(([s, m]) => {
        setStats(s);
        setMatches(m);
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
        <SectionTitle title="Quick actions" />
        <div className="grid gap-5 md:grid-cols-3">
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
