import { CloudDownload, Link2, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { byPlayerName, formatMatchDate, formatPoints } from '../lib/format';
import { apiError, cricheroesApi, matchApi, playerApi } from '../services/api';
import type { CricHeroesImportPlayer, CricHeroesPlayer, CricHeroesPreview, Match, Player } from '../types';

const ROLES = ['WK', 'BAT', 'AR', 'BOWL'];
const NEW = 'new';
const SKIP = 'skip';

const REASON: Record<CricHeroesPlayer['match_reason'], { label: string; className: string }> = {
  linked: { label: 'Linked', className: 'bg-pitch-50 text-pitch-700 ring-pitch-200' },
  name: { label: 'Name match', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  none: { label: 'New', className: 'bg-gold-soft text-amber-800 ring-amber-200' },
};

const STATUS_LABEL: Record<string, string> = { upcoming: 'Upcoming', live: 'Live', past: 'Completed' };

type Decisions = Record<number, CricHeroesImportPlayer>;

function initialDecisions(preview: CricHeroesPreview): Decisions {
  const next: Decisions = {};
  for (const p of preview.players) {
    next[p.cricheroes_player_id] = { cricheroes_player_id: p.cricheroes_player_id, player_id: p.player_id, role: p.suggested_role, skip: false };
  }
  return next;
}

export default function AdminCricHeroesPage() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [appPlayers, setAppPlayers] = useState<Player[]>([]);
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState('');
  const [preview, setPreview] = useState<CricHeroesPreview | null>(null);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [matchName, setMatchName] = useState('');
  const [savePoints, setSavePoints] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedMatchId, setImportedMatchId] = useState<number | null>(null);

  useEffect(() => {
    matchApi
      .list()
      .then(setMatches)
      .catch((err) => notify(apiError(err, 'Could not load matches'), 'error'));
  }, [notify]);

  async function loadPreview() {
    const [data, players] = await Promise.all([
      cricheroesApi.preview({ url: url.trim(), match_id: target ? Number(target) : null }),
      playerApi.list(),
    ]);
    setPreview(data);
    setAppPlayers(players);
    setDecisions(initialDecisions(data));
    setMatchName(`${data.team_a.name} vs ${data.team_b.name}`.slice(0, 200));
    setSavePoints(data.has_scorecard);
  }

  async function onFetch(e: FormEvent) {
    e.preventDefault();
    setFetching(true);
    setPreview(null);
    setImportedMatchId(null);
    try {
      await loadPreview();
    } catch (err) {
      notify(apiError(err, 'Could not read that CricHeroes match'), 'error');
    } finally {
      setFetching(false);
    }
  }

  const creatingMatch = preview !== null && preview.match_id === null;
  const counts = useMemo(() => {
    const values = Object.values(decisions);
    return {
      skipped: values.filter((d) => d.skip).length,
      created: values.filter((d) => !d.skip && d.player_id === null).length,
      linked: values.filter((d) => !d.skip && d.player_id !== null).length,
    };
  }, [decisions]);

  function update(id: number, patch: Partial<CricHeroesImportPlayer>) {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function onChoose(id: number, value: string) {
    if (value === SKIP) update(id, { skip: true, player_id: null });
    else if (value === NEW) update(id, { skip: false, player_id: null });
    else update(id, { skip: false, player_id: Number(value) });
  }

  async function onImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const result = await cricheroesApi.import({
        url: url.trim(),
        match_id: preview.match_id,
        match_name: creatingMatch ? matchName.trim() || null : null,
        players: Object.values(decisions),
        save_points: savePoints && preview.has_scorecard,
      });
      setImportedMatchId(result.match_id);
      const parts = [
        result.created_match ? 'match created' : null,
        result.players_created ? `${result.players_created} players added` : null,
        result.players_linked ? `${result.players_linked} linked` : null,
        result.points_saved ? `points saved for ${result.points_saved}` : null,
      ].filter(Boolean);
      notify(`Imported: ${parts.join(', ') || 'nothing to change'}`, 'success');
      setMatches(await matchApi.list());
      setTarget(String(result.match_id));
      await loadPreview().catch(() => undefined);
    } catch (err) {
      notify(apiError(err, 'Import failed'), 'error');
    } finally {
      setImporting(false);
    }
  }

  // A player can be linked once, so hide options already chosen for someone else.
  const chosen = new Set(Object.values(decisions).filter((d) => !d.skip && d.player_id !== null).map((d) => d.player_id));
  const nameTooShort = creatingMatch && matchName.trim().length < 2;

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Admin console"
        title="CricHeroes import"
        subtitle="Paste a CricHeroes match link to bring in the fixture, the playing XIs and fantasy points from the scorecard."
      />

      <form className="card mb-6 grid gap-4 p-4 sm:grid-cols-[1fr_260px_auto] sm:items-end" onSubmit={onFetch}>
        <label className="block">
          <span className="label">CricHeroes match link or ID</span>
          <input
            className="input"
            placeholder="https://cricheroes.com/scorecard/12345678/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="label">Import into</span>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Linked match, or create a new one</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.match_name} · {m.team_a} vs {m.team_b}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary !py-3" disabled={fetching || !url.trim()}>
          <CloudDownload className="h-4 w-4" aria-hidden="true" />
          {fetching ? 'Fetching…' : 'Fetch match'}
        </button>
      </form>

      {!preview ? (
        <EmptyState
          icon={<Link2 className="h-6 w-6" />}
          title={fetching ? 'Reading the scorecard…' : 'No match loaded'}
          body="Open the match in CricHeroes, copy the link from your browser or the app's share button, and paste it above."
        />
      ) : (
        <>
          <section className="card mb-6 p-5" aria-label="CricHeroes match">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2">
                <TeamCrest name={preview.team_a.name} size="lg" />
                <TeamCrest name={preview.team_b.name} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="display truncate text-2xl">
                  {preview.team_a.name} <span className="text-slate-400">vs</span> {preview.team_b.name}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {[preview.tournament_name, preview.start_time ? formatMatchDate(preview.start_time) : null, `CricHeroes #${preview.cricheroes_match_id}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {preview.result && <p className="mt-1 text-sm font-bold text-pitch-700">{preview.result}</p>}
              </div>
              <span className="chip ring-1 ring-inset ring-slate-200">{STATUS_LABEL[preview.status] ?? preview.status}</span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              {creatingMatch ? (
                <label className="block">
                  <span className="label">New match name</span>
                  <input className="input" value={matchName} maxLength={200} onChange={(e) => setMatchName(e.target.value)} />
                  <span className="mt-1.5 block text-xs text-slate-500">
                    A new match will be created for {preview.team_a.name} vs {preview.team_b.name}.
                  </span>
                </label>
              ) : (
                <p className="font-medium text-slate-600">
                  Importing into{' '}
                  <span className="font-bold text-ink">{matches.find((m) => m.id === preview.match_id)?.match_name ?? `match #${preview.match_id}`}</span>
                  : {preview.team_a.name} → {preview.team_a.app_team_name}, {preview.team_b.name} → {preview.team_b.app_team_name}
                </p>
              )}
            </div>

            {preview.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-xl bg-gold-soft px-4 py-3 text-xs font-medium text-amber-900">
                {preview.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            {importedMatchId !== null && (
              <p className="mt-4 text-sm font-semibold">
                Done.{' '}
                <Link className="text-pitch-700 underline" to="/admin/scoring">
                  Review points
                </Link>{' '}
                or{' '}
                <Link className="text-pitch-700 underline" to="/admin/matches">
                  manage the match
                </Link>
                .
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {([preview.team_a, preview.team_b] as const).map((team, index) => {
              const side = index === 0 ? 'a' : 'b';
              const rows = preview.players.filter((p) => p.side === side);
              const options = appPlayers.filter((p) => p.team_name === team.app_team_name).sort(byPlayerName);
              return (
                <section key={side} className="card overflow-hidden p-0" aria-label={`${team.name} players`}>
                  <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                    <TeamCrest name={team.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <h2 className="display truncate text-2xl">{team.name}</h2>
                      <p className="text-xs font-medium text-slate-500">App team: {team.app_team_name}</p>
                    </div>
                  </header>
                  {rows.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">No players published yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {rows.map((p) => {
                        const d = decisions[p.cricheroes_player_id];
                        const value = d.skip ? SKIP : d.player_id === null ? NEW : String(d.player_id);
                        const reason = REASON[p.match_reason];
                        return (
                          <li key={p.cricheroes_player_id} className={`px-5 py-3 ${d.skip ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-ink">{p.name}</p>
                                <span className={`chip mt-1 ring-1 ring-inset ${reason.className}`}>{reason.label}</span>
                              </div>
                              {p.points !== null && (
                                <details className="group relative text-right">
                                  <summary className="tabular cursor-pointer list-none font-display text-xl font-extrabold text-ink">
                                    {formatPoints(p.points)}
                                    <span className="ml-1 text-xs font-semibold text-slate-400">pts</span>
                                  </summary>
                                  <ul className="absolute right-0 z-10 mt-1 w-56 space-y-0.5 rounded-xl bg-ink p-3 text-left text-xs text-white shadow-lift">
                                    {p.breakdown.map((line, i) => (
                                      <li key={i} className="flex justify-between gap-3">
                                        <span>{line.label}</span>
                                        <span className="tabular font-bold">{formatPoints(line.points)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <select
                                className="input !py-2 text-sm"
                                aria-label={`App player for ${p.name}`}
                                value={value}
                                onChange={(e) => onChoose(p.cricheroes_player_id, e.target.value)}
                              >
                                <option value={NEW}>Add as new player</option>
                                {options
                                  .filter((o) => o.id === d.player_id || !chosen.has(o.id))
                                  .map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.player_name} ({o.role}){o.active ? '' : ' · inactive'}
                                    </option>
                                  ))}
                                <option value={SKIP}>Skip this player</option>
                              </select>
                              {value === NEW && (
                                <select
                                  className="input !w-24 !py-2 text-sm"
                                  aria-label={`Role for ${p.name}`}
                                  value={d.role}
                                  onChange={(e) => update(p.cricheroes_player_id, { role: e.target.value })}
                                >
                                  {ROLES.map((r) => (
                                    <option key={r}>{r}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl bg-ink p-2.5 pl-5 text-white shadow-lift">
              <p className="flex-1 text-sm font-semibold">
                <span className="tabular font-bold text-gold">{counts.created}</span> new ·{' '}
                <span className="tabular font-bold text-gold">{counts.linked}</span> linked
                {counts.skipped > 0 && <span className="text-slate-400"> · {counts.skipped} skipped</span>}
              </p>
              <label className={`flex items-center gap-2 text-xs font-semibold ${preview.has_scorecard ? '' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-lime"
                  checked={savePoints && preview.has_scorecard}
                  disabled={!preview.has_scorecard}
                  onChange={(e) => setSavePoints(e.target.checked)}
                />
                Save points
              </label>
              <button type="button" className="btn-lime" disabled={importing || nameTooShort} onClick={() => void onImport()}>
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
