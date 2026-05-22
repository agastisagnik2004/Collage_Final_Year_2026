from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from app.database import get_db
from app.auth import get_any_authenticated

router = APIRouter()


@router.get("/camera-frame/{camera_number}")
async def get_camera_frame(camera_number: int, _user: dict = Depends(get_any_authenticated)):
    """Grab a frame from the camera, run YOLO, return annotated JPEG with bounding boxes."""
    from app.detection import grab_and_annotate

    db = get_db()
    source = await db["camerasources"].find_one({"cameraNumber": camera_number})
    if not source or not (source.get("url") or "").strip():
        raise HTTPException(status_code=404, detail="Camera source not configured")

    url = source["url"].strip()
    annotated_bytes, counts = await grab_and_annotate(url)

    if annotated_bytes is None:
        raise HTTPException(status_code=503, detail="Cannot reach camera stream")

    # Only update status when the model actually detected someone
    # (0 detections = empty frame / bad angle — keep previous status)
    if counts.get("model_ready") and counts.get("detected"):
        status = "focused" if counts["focus"] >= counts["not_focus"] else "not_focused"
        now = datetime.now(timezone.utc)
        await db["camerastatuses"].find_one_and_update(
            {"cameraNumber": camera_number},
            {"$set": {"status": status, "cameraNumber": camera_number, "updatedAt": now, "detection": counts}},
            upsert=True,
        )

    return Response(content=annotated_bytes, media_type="image/jpeg")


@router.get("/detect/status")
async def detection_status(_user: dict = Depends(get_any_authenticated)):
    from app.detection import _model, MODEL_PATH
    from pathlib import Path
    db = get_db()
    sources = await db["camerasources"].find().to_list(None)
    last = await db["camerastatuses"].find_one(sort=[("updatedAt", -1)])
    return {
        "model_loaded": _model is not None,
        "model_path": MODEL_PATH,
        "model_file_exists": Path(MODEL_PATH).exists(),
        "sources_configured": len(sources),
        "sources": [{"camera": s["cameraNumber"], "url": s["url"]} for s in sources],
        "last_detection": last.get("updatedAt").isoformat() if last and last.get("updatedAt") else None,
    }


class CameraSourceRequest(BaseModel):
    camera_number: int
    url: str

    @field_validator("camera_number")
    @classmethod
    def valid_camera(cls, v: int) -> int:
        if v < 1 or v > 4:
            raise ValueError("camera_number must be between 1 and 4")
        return v


class CameraSourceOut(BaseModel):
    camera_number: int
    url: str


@router.post("/camera-sources", response_model=CameraSourceOut)
async def save_camera_source(
    body: CameraSourceRequest,
    _user: dict = Depends(get_any_authenticated),
):
    db = get_db()
    await db["camerasources"].find_one_and_update(
        {"cameraNumber": body.camera_number},
        {"$set": {
            "cameraNumber": body.camera_number,
            "url": body.url,
            "updatedAt": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return CameraSourceOut(camera_number=body.camera_number, url=body.url)


@router.get("/camera-sources", response_model=list[CameraSourceOut])
async def get_camera_sources(_user: dict = Depends(get_any_authenticated)):
    db = get_db()
    rows = await db["camerasources"].find().sort("cameraNumber", 1).to_list(None)
    return [CameraSourceOut(camera_number=r["cameraNumber"], url=r["url"]) for r in rows]
