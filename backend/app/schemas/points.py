from pydantic import BaseModel, Field


class PointsEntry(BaseModel):
    player_id: int
    points: float = Field(ge=-1000, le=1000, allow_inf_nan=False)


class PointsPayload(BaseModel):
    match_id: int
    entries: list[PointsEntry] = Field(max_length=200)
