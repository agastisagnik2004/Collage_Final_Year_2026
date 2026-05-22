from fastapi import APIRouter, HTTPException, status
from app.database import get_db
from app.auth import hash_password, verify_password, create_token
from app.models.user import RegisterRequest, LoginRequest, UserOut

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterRequest):
    db = get_db()
    existing = await db["users"].find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")
    result = await db["users"].insert_one({
        "name": body.name,
        "email": body.email.lower(),
        "password": hash_password(body.password),
    })
    return UserOut(id=str(result.inserted_id), name=body.name, email=body.email.lower())


@router.post("/login")
async def login(body: LoginRequest):
    db = get_db()
    user = await db["users"].find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_token(str(user["_id"]), role="teacher")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]},
    }
