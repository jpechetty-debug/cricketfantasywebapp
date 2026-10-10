"""Read a CricHeroes scorecard PDF (the "Download scorecard" file) into the same `ChMatch` the link import uses.

The PDF has no CricHeroes player ids, so each player gets a stable negative id derived from their name.
Negative ids never clash with real CricHeroes ids, and they stay the same from match to match, so a
player the admin maps once is recognised automatically next time.

PDF text extraction splits some words ("K V V ijay", "Sandeep Kumar Y adav"); names are compared with
`normalize_name`, which ignores spacing, so those still match.
"""

import io
import logging
import re
import zlib
from datetime import datetime

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.services.cricheroes import (
    ChBatting,
    ChBowling,
    ChMatch,
    ChPlayer,
    ChTeam,
    CricHeroesError,
    clean_name,
    normalize_name,
)

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 5 * 1024 * 1024
MAX_PAGES = 40
TEAM_A_ID, TEAM_B_ID = 1, 2

_PAGE_FOOTER = re.compile(r"\d{1,2}/\d{1,2}/\d{2,4},\s*\d{1,2}:\d{2}\s*[AP]M\s*c\s*r\s*i\s*c\s*h\s*e\s*r\s*o\s*e\s*s\s*\.\s*c\s*o\s*m\s*\d+\s*of\s*\d+")
_INNINGS = re.compile(r"^(?P<team>.+?)\s+\d+/\d+\s*\([\d.]+\s*Ov\)\s*\(\d+(?:st|nd|rd|th)\s+Innings\)", re.MULTILINE)
_BAT_ROW = re.compile(r"^\d+\s+(?P<body>.+?)\s+(?P<r>\d+)\s+(?P<b>\d+)\s+(?P<m>\d+)\s+(?P<f>\d+)\s+(?P<s>\d+)\s+(?:[\d.]+|-)$")
_BOWL_ROW = re.compile(
    r"^\d+\s+(?P<name>.+?)\s+(?P<o>\d+(?:\.\d)?)\s+(?P<m>\d+)\s+(?P<r>\d+)\s+(?P<w>\d+)(?:\s+\d+){5}\s+(?:[\d.]+|-)$"
)
_HAND = re.compile(r"\(\s*[RL]HB\s*\)", re.IGNORECASE)
# How a batting status starts, used to split "Name status" when there is no (RHB)/(LHB) marker.
_STATUS_START = re.compile(
    r"\s(?=(?:not out|retired|run\s*out|c\s*&\s*b\s|c\s|st\s|lbw|b\s|hit wicket|absent|obstruct|handled|timed out|did not bat)\b)",
    re.IGNORECASE,
)
# pypdf splits a capital from the rest of its word ("V ijay", "T ied"); rejoin for display.
_SPLIT_CAPITAL = re.compile(r"\b([A-Z]) (?=[a-z])")
_SQUAD_MARK = re.compile(r"\(\s*(?:c|vc|wk|c\s*&\s*wk)\s*\)", re.IGNORECASE)


def synthetic_player_id(name: str, salt: str = "") -> int:
    """Stable id for a PDF player: negative, so it can never equal a real CricHeroes id."""
    return -((zlib.crc32(f"{normalize_name(name)}|{salt}".encode()) & 0x7FFFFFFF) or 1)


def _display(text: str) -> str:
    return " ".join(_SPLIT_CAPITAL.sub(r"\1", text).split())


def extract_text(data: bytes) -> str:
    if len(data) > MAX_PDF_BYTES:
        raise CricHeroesError("The PDF is too large. Upload the scorecard PDF downloaded from CricHeroes")
    if not data.startswith(b"%PDF"):
        raise CricHeroesError("That file is not a PDF. Upload the scorecard PDF downloaded from CricHeroes")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise CricHeroesError("That PDF is password protected")
        if len(reader.pages) > MAX_PAGES:
            raise CricHeroesError("That PDF has too many pages to be a CricHeroes scorecard")
        pages = [page.extract_text() or "" for page in reader.pages]
    except CricHeroesError:
        raise
    except (PdfReadError, ValueError, KeyError, TypeError, OSError) as exc:
        logger.info("Could not read uploaded PDF: %s", exc)
        raise CricHeroesError("Could not read that PDF. Upload the scorecard PDF downloaded from CricHeroes") from exc
    return "\n".join(pages)


def parse_scorecard_pdf(data: bytes, match_id: int) -> ChMatch:
    return parse_scorecard_text(extract_text(data), match_id)


def parse_scorecard_text(raw: str, match_id: int) -> ChMatch:
    lines = [line.strip() for line in raw.replace("\r", "").split("\n")]
    lines = [line for line in lines if line and line != "�"]
    title = lines[0] if lines else ""
    text = "\n".join(lines)
    text = _PAGE_FOOTER.sub("\n", text)
    if title:
        text = text.replace(title, "\n")
    # Section headings run on from the previous line; put each on its own line.
    text = re.sub(r"(No\s+Batsman|No\s+Bowler|Match\s*Details|Match\s*Result|Best\s+Performances|Playing\s+Squad)", r"\n\1", text)

    teams = re.search(
        r"^Match(?!\s*(?:Details|Result|Officials))\s*(.+?)\s+vs\s+(.+?)\s*Ground", text, re.DOTALL | re.MULTILINE
    )
    if not teams or "Innings" not in text:
        raise CricHeroesError("This does not look like a CricHeroes scorecard PDF")
    team_a = ChTeam(TEAM_A_ID, _display(teams.group(1)))
    team_b = ChTeam(TEAM_B_ID, _display(teams.group(2)))
    team_by_key = {normalize_name(team_a.name): TEAM_A_ID, normalize_name(team_b.name): TEAM_B_ID}

    match = ChMatch(
        cricheroes_match_id=match_id,
        team_a=team_a,
        team_b=team_b,
        status="past",
        start_time=_start_time(text),
        tournament_name=_display(title) or None,
        result=_line_after(text, "Result"),
        has_scorecard=False,
    )
    squads = _squads(text, set(team_by_key))
    _read_innings(match, text, team_by_key, squads)
    return match


def _line_after(text: str, label: str) -> str | None:
    found = re.search(rf"^{label}\s*(.+)$", text, re.MULTILINE)
    return _display(found.group(1)) if found else None


def _start_time(text: str) -> datetime | None:
    found = re.search(r"Date\s*(\d{4})-(\d{2})-(\d{2}),\s*(\d{1,2}):(\d{2})\s*([AP]M)?\s*UTC", text)
    if not found:
        return None
    year, month, day, hour, minute, meridiem = found.groups()
    hour = int(hour)
    # CricHeroes prints a 24-hour time with AM/PM after it ("13:46 PM"); only convert genuine 12-hour times.
    if meridiem and hour <= 12:
        hour = hour % 12 + (12 if meridiem.upper() == "PM" else 0)
    try:
        return datetime(int(year), int(month), int(day), hour, int(minute))
    except ValueError:
        return None


def _squads(text: str, team_keys: set[str]) -> dict[str, tuple[str, bool]]:
    """normalized name -> (display name, is keeper) from the Playing Squad page."""
    found = re.search(r"Playing\s+Squad(.*?)(?=\n[^\n]+?\(\d+(?:st|nd|rd|th)\s+Innings\)|\Z)", text, re.DOTALL)
    if not found:
        return {}
    squads: dict[str, tuple[str, bool]] = {}
    for line in found.group(1).split("\n"):
        line = line.strip()
        if not line or line.isdigit() or normalize_name(line) in team_keys:
            continue
        name = _display(clean_name(line))
        key = normalize_name(name)
        if key:
            keeper = bool(re.search(r"\(\s*(?:c\s*&\s*)?wk\s*\)", line, re.IGNORECASE))
            previous = squads.get(key)
            squads[key] = (name, keeper or (previous[1] if previous else False))
    return squads


def _read_innings(match: ChMatch, text: str, team_by_key: dict[str, int], squads: dict[str, tuple[str, bool]]) -> None:
    players: dict[int, ChPlayer] = {}
    confirmed: set[int] = set()
    headers = list(_INNINGS.finditer(text))
    innings_seen: dict[int, int] = {}

    def player(raw_name: str, team_id: int, played: bool = True) -> ChPlayer | None:
        name = clean_name(_HAND.sub("", raw_name))
        key = normalize_name(name)
        if not key:
            return None
        pid = synthetic_player_id(name)
        existing = players.get(pid)
        # The same name playing for both sides is two different people.
        if existing and pid in confirmed and played and existing.team_id != team_id:
            pid = synthetic_player_id(name, salt=str(team_id))
            existing = players.get(pid)
        if existing is None:
            display, keeper = squads.get(key, (_display(name), False))
            existing = players[pid] = ChPlayer(cricheroes_player_id=pid, name=display, team_id=team_id, is_keeper=keeper)
        if re.search(r"\(\s*(?:c\s*&\s*)?wk\s*\)", raw_name, re.IGNORECASE):
            existing.is_keeper = True
        if played and pid not in confirmed:
            existing.team_id = team_id
            confirmed.add(pid)
        return existing

    for index, header in enumerate(headers):
        batting_team = team_by_key.get(normalize_name(header.group("team")))
        if batting_team is None:
            continue
        innings_seen[batting_team] = innings_seen.get(batting_team, 0) + 1
        # Each side bats once in a limited-overs match; a second innings is a super over, which doesn't score.
        if innings_seen[batting_team] > 1:
            continue
        fielding_team = TEAM_B_ID if batting_team == TEAM_A_ID else TEAM_A_ID
        end = headers[index + 1].start() if index + 1 < len(headers) else len(text)
        block = text[header.end():end]
        batting, _, rest = block.partition("Extras")
        bowling = rest.split("No Bowler", 1)[1] if "No Bowler" in rest else ""
        match.has_scorecard = True

        position = 0
        for line in batting.split("\n"):
            row = _BAT_ROW.match(line.strip())
            if not row:
                continue
            name, dismissal = _split_batter(row.group("body"), squads)
            p = player(name, batting_team)
            if not p:
                continue
            position += 1
            dismissal = " ".join(dismissal.split())
            p.batting.append(
                ChBatting(
                    runs=int(row.group("r")),
                    balls=int(row.group("b")),
                    fours=int(row.group("f")),
                    sixes=int(row.group("s")),
                    dismissal=dismissal,
                    position=position,
                )
            )
            if dismissal:
                match.dismissals.append((fielding_team, dismissal))

        # Stay on the same line: an empty "To Bat:" must not pick up the "Fall of Wickets" heading below it.
        to_bat = re.search(r"To\s*Bat:[ \t]*(.*)", rest)
        if to_bat:
            for name in to_bat.group(1).split(","):
                player(name, batting_team, played=False)

        for line in bowling.split("\n"):
            row = _BOWL_ROW.match(line.strip())
            if row and (p := player(row.group("name"), fielding_team)):
                p.bowling.append(
                    ChBowling(overs=row.group("o"), maidens=int(row.group("m")), runs=int(row.group("r")), wickets=int(row.group("w")))
                )
    match.players = list(players.values())


def _split_batter(body: str, squads: dict[str, tuple[str, bool]]) -> tuple[str, str]:
    """Split "Name (RHB) c X b Y" into the batter's name and the dismissal text."""
    hand = _HAND.search(body)
    if hand:
        return body[: hand.start()], body[hand.end():]
    # No batting-hand marker: prefer the longest prefix that is a known squad name.
    words = body.split()
    for cut in range(len(words) - 1, 0, -1):
        if normalize_name(" ".join(words[:cut])) in squads:
            return " ".join(words[:cut]), " ".join(words[cut:])
    status = _STATUS_START.search(body)
    if status:
        return body[: status.start()], body[status.end():]
    return body, ""
