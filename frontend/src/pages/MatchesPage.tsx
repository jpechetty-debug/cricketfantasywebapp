import { Swords } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import { CardSkeleton } from '../components/Skeleton';
import { EmptyState, PageHeader } from '../components/ui';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';
import { isMatchEditable } from '../lib/format';
import { apiError, matchApi, teamApi } from '../services/api';
import type { FantasyTeam, Match } from '../types';

type Tab = 'open' | 'locked' | 'closed';

const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: 'open', label: 'Open', empty: 'No matches are open for squads right now.' },
  { id: 'locked', label: 'In play', empty: 'No matches are in play.' },
  { id: 'closed', label: 'Completed', empty: 'No completed matches yet.' },
];

export default function MatchesPage() {
  const { notify } = useToast();
  const now = useNow();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('open');

  useEffect(() => {
    Promise.all([matchApi.list(), teamApi.mine()])
      .then(([m, t]) => {
        setMatches(m);
        setTeams(t);
      })
      .catch((err) => notify(apiError(err, 'Could not load matches'), 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  const grouped = useMemo(() => {
    const groups: Record<Tab, Match[]> = { open: [], locked: [], closed: [] };
    for (const m of matches) {
      if (m.status === 'closed') groups.closed.push(m);
      else if (isMatchEditable(m, now)) groups.open.push(m);
      else groups.locked.push(m);
    }
    groups.open.sort((a, b) => a.match_date.localeCompare(b.match_date));
    return groups;
  }, [matches, now]);

  const teamByMatch = useMemo(() => new Map(teams.map((t) => [t.match_id, t])), [teams]);
  const list = grouped[tab];

  return (
    <div>
      <PageHeader eyebrow="Fixtures" title="Matches" subtitle="Pick a squad for any open match. Edits close at the start time." />

      <div className="mb-6 inline-flex gap-1 rounded-xl bg-white p-1 shadow-card ring-1 ring-slate-200/80" role="tablist" aria-label="Match status">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === t.id ? 'bg-ink text-white' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {t.label}
            <span className={`tabular rounded-full px-1.5 text-xs ${tab === t.id ? 'bg-white/15' : 'bg-slate-100'}`}>{grouped[t.id].length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Swords className="h-6 w-6" />} title="Nothing here" body={TABS.find((t) => t.id === tab)?.empty} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((match) => (
            <MatchCard key={match.id} match={match} myPoints={teamByMatch.get(match.id)?.total_points ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
