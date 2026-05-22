from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_any_authenticated
from app.models.camera import CameraStatusRequest, CameraStatusOut

router = APIRouter()


def _fmt(doc: dict[str, Any]) -> CameraStatusOut:
    return CameraStatusOut(
        id=str(doc["_id"]),
        camera_number=doc["cameraNumber"],
        status=doc["status"],
        updated_at=doc.get("updatedAt", datetime.now(timezone.utc)),
    )


@router.get("/camera-status", response_model=list[CameraStatusOut])
async def get_camera_statuses(_user: dict = Depends(get_any_authenticated)):
    db = get_db()
    rows = await db["camerastatuses"].find().sort("cameraNumber", 1).to_list(None)
    return [_fmt(r) for r in rows]


@router.post("/camera-status", response_model=CameraStatusOut)
async def upsert_camera_status(
    body: CameraStatusRequest,
    _user: dict = Depends(get_any_authenticated),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db["camerastatuses"].find_one_and_update(
        {"cameraNumber": body.camera_number},
        {"$set": {"status": body.status, "cameraNumber": body.camera_number, "updatedAt": now}},
        upsert=True,
        return_document=True,
    )
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to update camera status")
    return _fmt(result)
