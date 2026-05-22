from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_any_authenticated
from app.models.stats import StudentStatsRequest, StudentStatsOut
from datetime import datetime, timezone

router = APIRouter()


@router.post("/student-stats", response_model=StudentStatsOut, status_code=201)
async def create_stats(body: StudentStatsRequest, _user: dict = Depends(get_any_authenticated)):
    db = get_db()
    t = body.total_students
    f = body.focused_students
    nf = t - f
    focus_pct = round(f / t * 100, 1) if t > 0 else 0.0
    not_focus_pct = round(nf / t * 100, 1) if t > 0 else 0.0
    now = datetime.now(timezone.utc)
    result = await db["studentstats"].insert_one({
        "totalStudents": t,
        "focusedStudents": f,
        "notFocusedStudents": nf,
        "focusPercentage": focus_pct,
        "notFocusPercentage": not_focus_pct,
        "createdAt": now,
    })
    return StudentStatsOut(
        id=str(result.inserted_id),
        total_students=t,
        focused_students=f,
        not_focused_students=nf,
        focus_percentage=focus_pct,
        not_focus_percentage=not_focus_pct,
        created_at=now,
    )
