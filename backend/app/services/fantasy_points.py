"""Turn a CricHeroes scorecard into fantasy points per player.

The rules are a simplified T20 fantasy system. Captain (2x) and vice-captain (1.5x) multipliers are
applied later per user squad by `scoring.calculate_team_points`, not here.
"""

import re
from dataclasses import dataclass

from app.services.cricheroes import ChMatch, ChPlayer, normalize_name

RULES: dict[str, float] = {
    "playing": 4,
    "run": 1,
    "four": 1,
    "six": 2,
    "thirty": 4,
    "fifty": 8,
    "hundred": 16,
    "duck": -2,
    "wicket": 25,
    "lbw_bowled": 8,
    "three_wickets": 4,
    "four_wickets": 8,
    "five_wickets": 16,
    "maiden": 12,
    "catch": 8,
    "three_catches": 4,
    "stumping": 12,
    "run_out": 6,
}

NOT_OUT = ("not out", "retired hurt", "retired not out", "absent", "did not bat")
_MARKS = re.compile(r"[†�*]|\(sub\)", re.IGNORECASE)  # keeper dagger, its mojibake, substitute tag


@dataclass
class PointsLine:
    label: str
    points: float


@dataclass
class Dismissal:
    kind: str  # caught, stumped, run_out, lbw, bowled, other, not_out
    fielders: list[str]
    bowler: str | None


def parse_dismissal(text: str) -> Dismissal:
    t = " ".join(_MARKS.sub(" ", text).split())
    low = t.lower()
    if not low or low.startswith(NOT_OUT):
        return Dismissal("not_out", [], None)
    if m := re.match(r"c\s*&\s*b\s+(.+)$", t, re.IGNORECASE):
        return Dismissal("caught", [m.group(1)], m.group(1))
    if m := re.match(r"c\s+(.+?)\s+b\s+(.+)$", t, re.IGNORECASE):
        return Dismissal("caught", [m.group(1)], m.group(2))
    if m := re.match(r"st\s+(.+?)\s+b\s+(.+)$", t, re.IGNORECASE):
        return Dismissal("stumped", [m.group(1)], m.group(2))
    if m := re.match(r"lbw\s+b\s+(.+)$", t, re.IGNORECASE):
        return Dismissal("lbw", [], m.group(1))
    if m := re.match(r"b\s+(.+)$", t, re.IGNORECASE):
        return Dismissal("bowled", [], m.group(1))
    if m := re.match(r"run\s*out\s*\(?(.*?)\)?$", t, re.IGNORECASE):
        return Dismissal("run_out", [n.strip() for n in m.group(1).split("/") if n.strip()], None)
    return Dismissal("other", [], None)


def score_match(match: ChMatch) -> tuple[dict[int, list[PointsLine]], list[str]]:
    """Points breakdown per CricHeroes player id, plus warnings for names we could not resolve."""
    lines: dict[int, list[PointsLine]] = {p.cricheroes_player_id: [] for p in match.players}
    warnings: list[str] = []
    if not match.has_scorecard:
        return lines, warnings

    for p in match.players:
        out = lines[p.cricheroes_player_id]
        out.append(PointsLine("Playing XI", RULES["playing"]))
        _batting_points(p, out)
        _bowling_points(p, out)

    by_team: dict[int, dict[str, list[int]]] = {}
    for p in match.players:
        by_team.setdefault(p.team_id, {}).setdefault(normalize_name(p.name), []).append(p.cricheroes_player_id)

    catches: dict[int, int] = {}
    for fielding_team, text in match.dismissals:
        d = parse_dismissal(text)
        names = by_team.get(fielding_team, {})
        for fielder in d.fielders:
            pid = _resolve(names, fielder)
            if pid is None:
                warnings.append(f"Fielder '{fielder}' in '{text}' is not in the playing XI, no fielding points given")
                continue
            if d.kind == "caught":
                catches[pid] = catches.get(pid, 0) + 1
                lines[pid].append(PointsLine("Catch", RULES["catch"]))
            elif d.kind == "stumped":
                lines[pid].append(PointsLine("Stumping", RULES["stumping"]))
            elif d.kind == "run_out":
                lines[pid].append(PointsLine("Run out", RULES["run_out"]))
        if d.kind in ("lbw", "bowled") and d.bowler:
            pid = _resolve(names, d.bowler)
            if pid is not None:
                lines[pid].append(PointsLine("LBW/bowled bonus", RULES["lbw_bowled"]))
    for pid, count in catches.items():
        if count >= 3:
            lines[pid].append(PointsLine("3-catch bonus", RULES["three_catches"]))
    return lines, warnings


def total(lines: list[PointsLine]) -> float:
    return round(sum(line.points for line in lines), 2)


def _batting_points(p: ChPlayer, out: list[PointsLine]) -> None:
    for inning in p.batting:
        if inning.runs:
            out.append(PointsLine(f"{inning.runs} runs", inning.runs * RULES["run"]))
        if inning.fours:
            out.append(PointsLine(f"{inning.fours} x 4", inning.fours * RULES["four"]))
        if inning.sixes:
            out.append(PointsLine(f"{inning.sixes} x 6", inning.sixes * RULES["six"]))
        if inning.runs >= 100:
            out.append(PointsLine("Century", RULES["hundred"]))
        elif inning.runs >= 50:
            out.append(PointsLine("Half-century", RULES["fifty"]))
        elif inning.runs >= 30:
            out.append(PointsLine("30-run bonus", RULES["thirty"]))
        elif inning.runs == 0 and parse_dismissal(inning.dismissal).kind != "not_out":
            out.append(PointsLine("Duck", RULES["duck"]))


def _bowling_points(p: ChPlayer, out: list[PointsLine]) -> None:
    for spell in p.bowling:
        if spell.wickets:
            out.append(PointsLine(f"{spell.wickets} wicket{'s' if spell.wickets > 1 else ''}", spell.wickets * RULES["wicket"]))
        if spell.wickets >= 5:
            out.append(PointsLine("5-wicket haul", RULES["five_wickets"]))
        elif spell.wickets == 4:
            out.append(PointsLine("4-wicket haul", RULES["four_wickets"]))
        elif spell.wickets == 3:
            out.append(PointsLine("3-wicket haul", RULES["three_wickets"]))
        if spell.maidens:
            out.append(PointsLine(f"{spell.maidens} maiden{'s' if spell.maidens > 1 else ''}", spell.maidens * RULES["maiden"]))


def _resolve(names: dict[str, list[int]], raw: str) -> int | None:
    key = normalize_name(raw)
    if not key:
        return None
    exact = names.get(key)
    if exact and len(exact) == 1:
        return exact[0]
    # Scorecards sometimes shorten names; accept a unique prefix match either way round.
    loose = {pid for name, ids in names.items() if name.startswith(key) or key.startswith(name) for pid in ids}
    return loose.pop() if len(loose) == 1 else None


def suggest_role(p: ChPlayer) -> str:
    if p.is_keeper:
        return "WK"
    bowled = any(spell.overs not in ("", "0") for spell in p.bowling)
    top_order = any(inning.position <= 6 and inning.balls > 0 for inning in p.batting)
    if bowled and top_order:
        return "AR"
    return "BOWL" if bowled else "BAT"
