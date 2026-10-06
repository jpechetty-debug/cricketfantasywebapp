"""Read match data from public CricHeroes scorecard pages.

CricHeroes has no public API. Its scorecard pages are rendered by Next.js and carry the match
summary and full scorecard as JSON inside the React Server Components payload
(`self.__next_f.push([1, "..."])` script chunks). This module downloads such a page and turns that
JSON into plain dataclasses. It is unofficial, so it fails loudly with `CricHeroesError` whenever
the page does not look like we expect.
"""

import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urlparse

PAGE_URL = "https://cricheroes.com/scorecard/{match_id}/individual/match/scorecard"
USER_AGENT = "Mozilla/5.0 (compatible; BachpanCricketLeague/1.0; +https://cricheroes.com)"
TIMEOUT_SECONDS = 15
MAX_PAGE_BYTES = 5 * 1024 * 1024
ALLOWED_HOSTS = {"cricheroes.com", "www.cricheroes.com", "cricheroes.in", "www.cricheroes.in"}

_RSC_CHUNK = re.compile(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)')
_ROLE_MARKER = re.compile(r"\((?:c|vc|wk|c\s*&\s*wk)\)", re.IGNORECASE)
_NON_WORD = re.compile(r"[^0-9a-z]+")


class CricHeroesError(Exception):
    """The match could not be read; the message is safe to show to an admin."""


@dataclass
class ChBatting:
    runs: int
    balls: int
    fours: int
    sixes: int
    dismissal: str
    position: int


@dataclass
class ChBowling:
    overs: str
    maidens: int
    runs: int
    wickets: int


@dataclass
class ChPlayer:
    cricheroes_player_id: int
    name: str
    team_id: int
    is_keeper: bool = False
    # One entry per innings the player batted / bowled in.
    batting: list[ChBatting] = field(default_factory=list)
    bowling: list[ChBowling] = field(default_factory=list)


@dataclass
class ChTeam:
    cricheroes_team_id: int
    name: str


@dataclass
class ChMatch:
    cricheroes_match_id: int
    team_a: ChTeam
    team_b: ChTeam
    status: str  # "upcoming", "live" or "past"
    start_time: datetime | None  # naive UTC
    tournament_name: str | None
    result: str | None
    has_scorecard: bool
    players: list[ChPlayer] = field(default_factory=list)
    # (fielding team id, dismissal text) for every batter in the scorecard.
    dismissals: list[tuple[int, str]] = field(default_factory=list)


def parse_match_id(value: str) -> int:
    """Accept a CricHeroes scorecard link (any tab) or a bare numeric match id."""
    value = value.strip()
    if value.isdigit():
        return int(value)
    parsed = urlparse(value if "://" in value else f"https://{value}")
    if (parsed.hostname or "").lower() not in ALLOWED_HOSTS:
        raise CricHeroesError("Paste a cricheroes.com match link or the numeric match ID")
    match = re.search(r"/scorecard/(\d+)", parsed.path)
    if not match:
        raise CricHeroesError("That link is not a CricHeroes match scorecard")
    return int(match.group(1))


def clean_name(name: str) -> str:
    """Display name without captain/keeper markers or stray underscores."""
    name = _ROLE_MARKER.sub("", name).replace("_", " ")
    return " ".join(name.split())


def normalize_name(name: str) -> str:
    """Comparison key: case, punctuation and markers ignored."""
    return " ".join(_NON_WORD.sub(" ", clean_name(name).lower()).split())


def fetch_match(match_id: int) -> ChMatch:
    # The URL is always rebuilt from the numeric id, so admins cannot point the server at other hosts.
    url = PAGE_URL.format(match_id=match_id)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            html = response.read(MAX_PAGE_BYTES + 1).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raise CricHeroesError(f"CricHeroes returned HTTP {exc.code} for match {match_id}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise CricHeroesError("Could not reach CricHeroes. Try again in a minute") from exc
    if len(html) > MAX_PAGE_BYTES:
        raise CricHeroesError("The CricHeroes page was unexpectedly large")
    return parse_match_page(html, match_id)


def parse_match_page(html: str, match_id: int) -> ChMatch:
    if re.search(r"<title>\s*CricHeroes:\s*(404|410)", html):
        raise CricHeroesError(f"CricHeroes match {match_id} was not found, or it is private")
    payload = "".join(json.loads(f'"{chunk}"') for chunk in _RSC_CHUNK.findall(html))
    summary = _find_json(payload, "summaryData", "{")
    data = summary.get("data") if isinstance(summary, dict) else None
    if not isinstance(data, dict) or not isinstance(data.get("team_a"), dict):
        raise CricHeroesError(
            "CricHeroes has not published details for this match yet, or its page format changed"
        )

    team_a = _team(data["team_a"])
    team_b = _team(data.get("team_b") or {})
    innings = _find_json(payload, "scoreCardData", "[") or []
    match = ChMatch(
        cricheroes_match_id=match_id,
        team_a=team_a,
        team_b=team_b,
        status=str(data.get("status") or "upcoming"),
        start_time=_parse_time(data.get("start_datetime")),
        tournament_name=(str(data.get("tournament_name") or "").strip() or None),
        result=_result(data),
        has_scorecard=bool(innings),
    )
    _read_scorecard(match, innings)
    if not match.players:
        _read_squads(match, _find_json(payload, "teamSquad", "{"))
    return match


def _find_json(payload: str, key: str, opener: str):
    """Decode the first `"key":{...}` (or `[...]`) in the payload; RSC references like "$21:..." are skipped."""
    found = re.search(rf'"{key}"\s*:\s*{re.escape(opener)}', payload)
    if not found:
        return None
    try:
        value, _ = json.JSONDecoder().raw_decode(payload, found.end() - 1)
    except ValueError:
        return None
    return value


def _team(raw: dict) -> ChTeam:
    try:
        return ChTeam(cricheroes_team_id=int(raw["id"]), name=" ".join(str(raw["name"]).split()))
    except (KeyError, TypeError, ValueError) as exc:
        raise CricHeroesError("Could not read the teams from the CricHeroes page") from exc


def _parse_time(value) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _result(data: dict) -> str | None:
    winner, margin = data.get("winning_team"), data.get("win_by")
    if winner and margin:
        return f"{winner} won by {margin}"
    return (str(data.get("match_result") or "").strip() or None) if data.get("status") == "past" else None


def _int(value) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _read_scorecard(match: ChMatch, innings: list) -> None:
    team_ids = {match.team_a.cricheroes_team_id, match.team_b.cricheroes_team_id}
    players: dict[int, ChPlayer] = {}

    def player(raw: dict, team_id: int) -> ChPlayer | None:
        pid = _int(raw.get("player_id"))
        if not pid or team_id not in team_ids:
            return None
        if pid not in players:
            players[pid] = ChPlayer(cricheroes_player_id=pid, name=clean_name(str(raw.get("name") or "")), team_id=team_id)
        if re.search(r"\((?:c\s*&\s*)?wk\)", str(raw.get("name") or ""), re.IGNORECASE):
            players[pid].is_keeper = True
        return players[pid]

    for inning in innings:
        if not isinstance(inning, dict):
            continue
        batting_team = _int(inning.get("team_id"))
        fielding_team = next((t for t in team_ids if t != batting_team), 0)
        for position, raw in enumerate(inning.get("batting") or [], start=1):
            p = player(raw, batting_team)
            if not p:
                continue
            dismissal = " ".join(str(raw.get("how_to_out") or "").split())
            p.batting.append(ChBatting(
                runs=_int(raw.get("runs")),
                balls=_int(raw.get("balls")),
                fours=_int(raw.get("4s")),
                sixes=_int(raw.get("6s")),
                dismissal=dismissal,
                position=position,
            ))
            if dismissal:
                match.dismissals.append((fielding_team, dismissal))
        for raw in inning.get("to_be_bat") or []:
            player(raw, batting_team)
        for raw in inning.get("bowling") or []:
            p = player(raw, fielding_team)
            if p:
                p.bowling.append(ChBowling(
                    overs=str(raw.get("overs") or "0"),
                    maidens=_int(raw.get("maidens")),
                    runs=_int(raw.get("runs")),
                    wickets=_int(raw.get("wickets")),
                ))
    match.players = list(players.values())


def _read_squads(match: ChMatch, squad) -> None:
    """Best effort: pre-match squads, when CricHeroes renders them into the page."""
    if not isinstance(squad, dict):
        return
    for key, team in (("team_a", match.team_a), ("team_b", match.team_b)):
        block = squad.get(key)
        if isinstance(block, dict):
            block = next((v for v in block.values() if isinstance(v, list)), [])
        for raw in block if isinstance(block, list) else []:
            if not isinstance(raw, dict):
                continue
            pid = _int(raw.get("player_id"))
            name = raw.get("name") or raw.get("player_name")
            if pid and name:
                match.players.append(
                    ChPlayer(
                        cricheroes_player_id=pid,
                        name=clean_name(str(name)),
                        team_id=team.cricheroes_team_id,
                        is_keeper=bool(re.search(r"\(.*wk\)", str(name), re.IGNORECASE)),
                    )
                )
