from typing import Any
from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user
from app.models.schedule import ScheduleRequest, ScheduleOut

router = APIRouter()


@router.post("/schedule", response_model=ScheduleOut, status_code=201)
async def create_schedule(body: ScheduleRequest, user: dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    result = await db["schedules"].insert_one({
        "date": body.date,
        "day": body.day,
        "time": body.time,
        "roomNo": body.room_no,
        "userId": user["_id"],
    })
    return ScheduleOut(
        id=str(result.inserted_id),
        date=body.date,
        day=body.day,
        time=body.time,
        room_no=body.room_no,
        user_id=str(user["_id"]),
    )
