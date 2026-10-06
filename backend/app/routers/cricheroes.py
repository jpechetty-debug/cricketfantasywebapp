import base64
import binascii
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.deps import require_admin
from app.models.cricheroes import CricHeroesMatchLink, CricHeroesPlayerLink
from app.models.match import Match
from app.models.player import Player
from app.models.user import User
from app.schemas.cricheroes import (
    CricHeroesImportRequest,
    CricHeroesImportResult,
    CricHeroesPdfImportRequest,
    CricHeroesPdfPreviewRequest,
    CricHeroesPreview,
    CricHeroesPreviewRequest,
    ImportPlayer,
    PointsLineOut,
    PreviewPlayer,
    PreviewTeam,
)
from app.services import cricheroes
from app.services.cricheroes import ChMatch, CricHeroesError, normalize_name
from app.services.cricheroes_pdf import parse_scorecard_pdf
from app.services.fantasy_points import score_match, suggest_role, total
from app.services.scoring import set_player_points
from app.services.teams import canonical_team

router = APIRouter(prefix="/cricheroes", tags=["cricheroes"])
logger = logging.getLogger("bachpan.cricheroes")

# CricHeroes match state -> app match status for newly created matches.
STATUS_MAP = {"upcoming": "open", "live": "locked", "past": "closed"}


def _load(url: str) -> ChMatch:
    try:
        return cricheroes.fetch_match(cricheroes.parse_match_id(url))
    except CricHeroesError as exc:
        logger.info("CricHeroes lookup failed for %r: %s", url, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


def _load_pdf(payload: CricHeroesPdfPreviewRequest) -> ChMatch:
    try:
        match_id = _pdf_match_id(payload)
        try:
            data = base64.b64decode(payload.pdf_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise CricHeroesError("The uploaded file could not be read. Choose the PDF again") from exc
        return parse_scorecard_pdf(data, match_id)
    except CricHeroesError as exc:
        logger.info("CricHeroes PDF import failed for %r: %s", payload.filename, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


def _pdf_match_id(payload: CricHeroesPdfPreviewRequest) -> int:
    """The PDF itself has no match id; take it from the link if given, else from CricHeroes' Scorecard_<id>.pdf name."""
    if payload.url and payload.url.strip():
        return cricheroes.parse_match_id(payload.url)
    found = re.search(r"scorecard[_\s-]*(\d+)", payload.filename or "", re.IGNORECASE)
    if not found:
        raise CricHeroesError("Could not tell which CricHeroes match this is. Also paste the match link")
    return int(found.group(1))


def _target_match(db: Session, ch: ChMatch, match_id: int | None) -> Match | None:
    link = db.query(CricHeroesMatchLink).filter(CricHeroesMatchLink.cricheroes_match_id == ch.cricheroes_match_id).first()
    if match_id is None:
        return db.get(Match, link.match_id) if link else None
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if link and link.match_id != match.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This CricHeroes match is already imported into another match")
    other = db.query(CricHeroesMatchLink).filter(CricHeroesMatchLink.match_id == match.id).first()
    if other and other.cricheroes_match_id != ch.cricheroes_match_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That match is already linked to a different CricHeroes match")
    return match


def _team_names(db: Session, ch: ChMatch, match: Match | None) -> dict[int, str]:
    """CricHeroes team id -> app team name. Existing matches are paired by name, otherwise in order."""
    a, b = ch.team_a, ch.team_b
    if match is None:
        return {a.cricheroes_team_id: canonical_team(db, a.name[:120]), b.cricheroes_team_id: canonical_team(db, b.name[:120])}
    swapped = normalize_name(a.name) == normalize_name(match.team_b) or normalize_name(b.name) == normalize_name(match.team_a)
    if swapped:
        return {a.cricheroes_team_id: match.team_b, b.cricheroes_team_id: match.team_a}
    return {a.cricheroes_team_id: match.team_a, b.cricheroes_team_id: match.team_b}


def _suggest_players(db: Session, ch: ChMatch, team_names: dict[int, str]) -> dict[int, tuple[int | None, str]]:
    """CricHeroes player id -> (app player id, why). Saved links win, then an unambiguous name match on the same team."""
    app_players = db.query(Player).filter(Player.team_name.in_(set(team_names.values()))).all()
    links = {
        row.player_id: row.cricheroes_player_id
        for row in db.query(CricHeroesPlayerLink).filter(CricHeroesPlayerLink.player_id.in_([p.id for p in app_players]))
    }
    suggestions: dict[int, tuple[int | None, str]] = {}
    taken: set[int] = set()
    for p in ch.players:
        team = team_names[p.team_id]
        linked = next((a.id for a in app_players if a.team_name == team and links.get(a.id) == p.cricheroes_player_id), None)
        if linked is not None:
            suggestions[p.cricheroes_player_id] = (linked, "linked")
            taken.add(linked)
    for p in ch.players:
        if p.cricheroes_player_id in suggestions:
            continue
        key, team = normalize_name(p.name), team_names[p.team_id]
        same = [
            a.id
            for a in app_players
            if a.team_name == team
            and a.id not in taken
            and not _same_kind(links.get(a.id), p.cricheroes_player_id)
            and normalize_name(a.player_name) == key
        ]
        if len(same) == 1:
            suggestions[p.cricheroes_player_id] = (same[0], "name")
            taken.add(same[0])
        else:
            suggestions[p.cricheroes_player_id] = (None, "none")
    return suggestions


def _same_kind(linked_id: int | None, source_id: int) -> bool:
    """True when an existing link already ties the player to another id from the same source (link or PDF)."""
    return linked_id is not None and (linked_id > 0) == (source_id > 0)


def _build_preview(db: Session, ch: ChMatch, match: Match | None) -> CricHeroesPreview:
    team_names = _team_names(db, ch, match)
    suggestions = _suggest_players(db, ch, team_names)
    lines, warnings = score_match(ch)
    if not ch.players:
        warnings.append("CricHeroes has not published the playing XIs yet. You can import the fixture now and the players later")
    elif not ch.has_scorecard:
        warnings.append("No scorecard yet, so no points will be saved. Import again once the match has been played")

    def team(t) -> PreviewTeam:
        return PreviewTeam(cricheroes_team_id=t.cricheroes_team_id, name=t.name, app_team_name=team_names[t.cricheroes_team_id])

    players = []
    for p in ch.players:
        player_id, reason = suggestions[p.cricheroes_player_id]
        breakdown = lines.get(p.cricheroes_player_id, [])
        players.append(
            PreviewPlayer(
                cricheroes_player_id=p.cricheroes_player_id,
                name=p.name,
                side="a" if p.team_id == ch.team_a.cricheroes_team_id else "b",
                suggested_role=suggest_role(p),
                points=total(breakdown) if ch.has_scorecard else None,
                breakdown=[PointsLineOut(label=line.label, points=line.points) for line in breakdown],
                player_id=player_id,
                match_reason=reason,
            )
        )
    return CricHeroesPreview(
        cricheroes_match_id=ch.cricheroes_match_id,
        tournament_name=ch.tournament_name,
        start_time=ch.start_time,
        status=ch.status,
        result=ch.result,
        has_scorecard=ch.has_scorecard,
        match_id=match.id if match else None,
        team_a=team(ch.team_a),
        team_b=team(ch.team_b),
        players=players,
        warnings=warnings,
    )


@router.post("/preview", response_model=CricHeroesPreview)
def preview(payload: CricHeroesPreviewRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    ch = _load(payload.url)
    return _build_preview(db, ch, _target_match(db, ch, payload.match_id))


@router.post("/import", response_model=CricHeroesImportResult)
def import_match(payload: CricHeroesImportRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Re-read the page so saved points always come from CricHeroes, never from the client.
    ch = _load(payload.url)
    return _import(db, ch, payload.match_id, payload.match_name, payload.players, payload.save_points)


@router.post("/pdf/preview", response_model=CricHeroesPreview)
def preview_pdf(payload: CricHeroesPdfPreviewRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    ch = _load_pdf(payload)
    return _build_preview(db, ch, _target_match(db, ch, payload.match_id))


@router.post("/pdf/import", response_model=CricHeroesImportResult)
def import_pdf(payload: CricHeroesPdfImportRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    # The PDF is sent again and re-parsed, so points never come from the client's preview.
    ch = _load_pdf(payload)
    return _import(db, ch, payload.match_id, payload.match_name, payload.players, payload.save_points)


def _import(
    db: Session,
    ch: ChMatch,
    match_id: int | None,
    match_name: str | None,
    entries: list[ImportPlayer],
    save_points: bool,
) -> CricHeroesImportResult:
    match = _target_match(db, ch, match_id)
    created_match = match is None
    if match is None:
        match = Match(
            match_name=(match_name or f"{ch.team_a.name} vs {ch.team_b.name}").strip()[:200],
            team_a=canonical_team(db, ch.team_a.name[:120]),
            team_b=canonical_team(db, ch.team_b.name[:120]),
            match_date=ch.start_time or utcnow(),
            status=STATUS_MAP.get(ch.status, "open"),
        )
        db.add(match)
        db.flush()
    if not db.query(CricHeroesMatchLink).filter(CricHeroesMatchLink.match_id == match.id).first():
        db.add(CricHeroesMatchLink(match_id=match.id, cricheroes_match_id=ch.cricheroes_match_id))

    team_names = _team_names(db, ch, match)
    ch_players = {p.cricheroes_player_id: p for p in ch.players}
    lines, warnings = score_match(ch)
    unknown = [entry.cricheroes_player_id for entry in entries if entry.cricheroes_player_id not in ch_players]
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Some players are not part of this CricHeroes match")
    chosen = [entry.player_id for entry in entries if not entry.skip and entry.player_id is not None]
    if len(chosen) != len(set(chosen)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each app player can only be linked once")

    existing = {p.id: p for p in db.query(Player).filter(Player.id.in_(chosen))} if chosen else {}
    created = linked = 0
    points: dict[int, float] = {}
    for entry in entries:
        if entry.skip:
            continue
        source = ch_players[entry.cricheroes_player_id]
        team = team_names[source.team_id]
        if entry.player_id is None:
            player = Player(player_name=source.name[:120] or "Unknown", team_name=team, role=entry.role.strip(), active=True)
            db.add(player)
            db.flush()
            created += 1
        else:
            player = existing.get(entry.player_id)
            if not player or player.team_name != team:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{source.name} must be linked to a player from {team}",
                )
            linked += 1
        link = db.query(CricHeroesPlayerLink).filter(CricHeroesPlayerLink.player_id == player.id).first()
        if link:
            # A real CricHeroes id is better than a PDF name id, so a PDF import never replaces one.
            if source.cricheroes_player_id > 0 or link.cricheroes_player_id < 0:
                link.cricheroes_player_id = source.cricheroes_player_id
        else:
            db.add(CricHeroesPlayerLink(player_id=player.id, cricheroes_player_id=source.cricheroes_player_id))
        if ch.has_scorecard:
            points[player.id] = total(lines.get(source.cricheroes_player_id, []))

    if save_points and points:
        set_player_points(db, match.id, points)
    db.commit()
    logger.info("Imported CricHeroes match %s into match %s", ch.cricheroes_match_id, match.id)
    return CricHeroesImportResult(
        match_id=match.id,
        created_match=created_match,
        players_created=created,
        players_linked=linked,
        points_saved=len(points) if save_points else 0,
        warnings=warnings,
    )
