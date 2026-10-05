from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcOutput


class TeamCreate(BaseModel):
    match_id: int
    captain_id: int
    vice_captain_id: int
    selected_players: list[int] = Field(min_length=7, max_length=7)


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    match_id: int
    captain_id: int
    vice_captain_id: int
    selected_players: list[int]
    total_points: float
    created_at: UtcOutput
    user_name: str | None = None
    match_name: str | None = None
