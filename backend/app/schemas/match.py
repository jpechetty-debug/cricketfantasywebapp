from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import UtcInput, UtcOutput

MatchStatus = Literal["open", "locked", "closed"]


class MatchCreate(BaseModel):
    match_name: str = Field(min_length=2, max_length=200)
    team_a: str = Field(min_length=1, max_length=120)
    team_b: str = Field(min_length=1, max_length=120)
    match_date: UtcInput

    @model_validator(mode="after")
    def distinct_teams(self) -> "MatchCreate":
        if self.team_a.strip().lower() == self.team_b.strip().lower():
            raise ValueError("Team A and Team B must be different")
        return self


class MatchStatusUpdate(BaseModel):
    status: MatchStatus


class MatchTimeUpdate(BaseModel):
    match_date: UtcInput


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_name: str
    team_a: str
    team_b: str
    match_date: UtcOutput
    status: str
