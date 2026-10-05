from pydantic import BaseModel, ConfigDict, Field


class PlayerCreate(BaseModel):
    player_name: str = Field(min_length=1, max_length=120)
    team_name: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=40)
    active: bool = True


class PlayerUpdate(BaseModel):
    player_name: str | None = Field(default=None, min_length=1, max_length=120)
    team_name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, min_length=1, max_length=40)
    active: bool | None = None


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    player_name: str
    team_name: str
    role: str
    active: bool
