from pydantic import BaseModel, Field

from app.schemas.common import Mobile, NewMobile


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    mobile: NewMobile
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    mobile: Mobile
    password: str = Field(min_length=1, max_length=72)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    user_id: int
