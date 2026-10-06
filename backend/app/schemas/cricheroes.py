from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UtcOutput

Side = Literal["a", "b"]


class CricHeroesPreviewRequest(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    # Existing app match to import into; when omitted, a previously linked match is used, else a new one is created.
    match_id: int | None = None


class PointsLineOut(BaseModel):
    label: str
    points: float


class PreviewTeam(BaseModel):
    cricheroes_team_id: int
    name: str
    app_team_name: str


class PreviewPlayer(BaseModel):
    cricheroes_player_id: int
    name: str
    side: Side
    suggested_role: str
    points: float | None
    breakdown: list[PointsLineOut]
    player_id: int | None
    match_reason: Literal["linked", "name", "none"]


class CricHeroesPreview(BaseModel):
    cricheroes_match_id: int
    tournament_name: str | None
    start_time: UtcOutput | None
    status: str
    result: str | None
    has_scorecard: bool
    match_id: int | None
    team_a: PreviewTeam
    team_b: PreviewTeam
    players: list[PreviewPlayer]
    warnings: list[str]


class ImportPlayer(BaseModel):
    cricheroes_player_id: int
    # Existing app player to link; None creates a new player on the mapped team.
    player_id: int | None = None
    role: str = Field(default="BAT", min_length=1, max_length=40)
    skip: bool = False


class CricHeroesImportRequest(CricHeroesPreviewRequest):
    match_name: str | None = Field(default=None, min_length=2, max_length=200)
    players: list[ImportPlayer] = Field(default_factory=list, max_length=200)
    save_points: bool = True


class CricHeroesPdfPreviewRequest(BaseModel):
    # Scorecard PDF downloaded from CricHeroes, base64 encoded (about 4/3 of a 5 MB file at most).
    pdf_base64: str = Field(min_length=1, max_length=7_000_000)
    filename: str | None = Field(default=None, max_length=255)
    # Only needed when the file name does not carry the CricHeroes match id (Scorecard_<id>.pdf).
    url: str | None = Field(default=None, max_length=500)
    match_id: int | None = None


class CricHeroesPdfImportRequest(CricHeroesPdfPreviewRequest):
    match_name: str | None = Field(default=None, min_length=2, max_length=200)
    players: list[ImportPlayer] = Field(default_factory=list, max_length=200)
    save_points: bool = True


class CricHeroesImportResult(BaseModel):
    match_id: int
    created_match: bool
    players_created: int
    players_linked: int
    points_saved: int
    warnings: list[str]
