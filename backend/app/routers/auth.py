from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.user import UserOut
from app.services.auth import create_access_token, hash_password, verify_password
from app.services.rate_limit import limit_auth_attempts

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, dependencies=[Depends(limit_auth_attempts)])
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.mobile == payload.mobile).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile already registered")
    user = User(
        name=payload.name.strip(),
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile already registered")
    db.refresh(user)
    token = create_access_token(user.mobile, user.role)
    return Token(access_token=token, role=user.role, name=user.name, user_id=user.id)


@router.post("/login", response_model=Token, dependencies=[Depends(limit_auth_attempts)])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.mobile == payload.mobile).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mobile or password")
    token = create_access_token(user.mobile, user.role)
    return Token(access_token=token, role=user.role, name=user.name, user_id=user.id)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
