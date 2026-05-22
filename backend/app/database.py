import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
_db_failed = False


def get_db():
    if _db_failed or _client is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Database not available. MONGODB_URI may not be configured.",
        )
    return _client["classroom-monitor"]


async def connect_db() -> None:
    global _client, _db_failed
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        print("[WARN] MONGODB_URI not set -- database features will be unavailable.")
        _db_failed = True
        return
    try:
        _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=10000)
        await _client.admin.command("ping")
        _db_failed = False
        print("[OK] Connected to MongoDB Atlas")
    except Exception as e:
        print(f"[WARN] Could not connect to MongoDB: {e}")
        _db_failed = True


async def disconnect_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
