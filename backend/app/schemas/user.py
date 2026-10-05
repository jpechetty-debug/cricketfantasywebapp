from pydantic import BaseModel, ConfigDict

from app.schemas.common import UtcOutput


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    mobile: str
    role: str
    created_at: UtcOutput
