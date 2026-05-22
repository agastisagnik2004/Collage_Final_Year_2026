import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import create_token, verify_admin_token
from app.models.admin import (
    SendOtpRequest,
    VerifyOtpRequest,
    StartMonitoringRequest,
    MonitoringSessionOut,
)
from app.utils.email import send_otp_email

router = APIRouter()

OTP_EXPIRE_MINUTES = 5
OTP_COOLDOWN_SECONDS = 60


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    admin_email = os.getenv("ADMIN_EMAIL", "").lower().strip()
    if not admin_email:
        raise HTTPException(status_code=500, detail="Admin email not configured on the server")
    if body.email.lower().strip() != admin_email:
        raise HTTPException(status_code=401, detail="Email does not match admin credentials")

    db = get_db()
    now = datetime.now(timezone.utc)

    existing = await db["otpverifications"].find_one({"email": admin_email})
    if existing:
        sent_at = _ensure_utc(existing.get("sentAt", datetime.min.replace(tzinfo=timezone.utc)))
        if (now - sent_at).total_seconds() < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - (now - sent_at).total_seconds())
            raise HTTPException(status_code=429, detail=f"Please wait {remaining}s before requesting another OTP")

    otp = _generate_otp()
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)

    await db["otpverifications"].find_one_and_update(
        {"email": admin_email},
        {"$set": {"otp": otp, "sentAt": now, "expiresAt": expires_at, "verified": False}},
        upsert=True,
    )

    email_sent = await send_otp_email(admin_email, otp)
    if not email_sent:
        print(f"[DEV] OTP for {admin_email}: {otp}")

    return {"message": "OTP sent successfully", "email": admin_email}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest):
    admin_email = os.getenv("ADMIN_EMAIL", "").lower().strip()
    db = get_db()
    now = datetime.now(timezone.utc)

    record = await db["otpverifications"].find_one({"email": admin_email})
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new OTP.")

    expires_at = record.get("expiresAt")
    if expires_at:
        expires_at = _ensure_utc(expires_at)
        if now > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if record.get("otp") != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    await db["otpverifications"].update_one({"email": admin_email}, {"$set": {"verified": True}})

    token = create_token(admin_email, role="admin")
    return {"access_token": token, "token_type": "bearer", "admin": {"email": admin_email}}


@router.post("/start-monitoring", response_model=MonitoringSessionOut, status_code=201)
async def start_monitoring(
    body: StartMonitoringRequest,
    admin: dict[str, Any] = Depends(verify_admin_token),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db["monitoringsessions"].insert_one({
        "floorNo": body.floor_no,
        "roomNo": body.room_no,
        "startTime": body.start_time,
        "endTime": body.end_time,
        "startedAt": now,
        "status": "active",
        "adminEmail": admin["email"],
    })
    return MonitoringSessionOut(
        id=str(result.inserted_id),
        floor_no=body.floor_no,
        room_no=body.room_no,
        start_time=body.start_time,
        end_time=body.end_time,
        started_at=now,
        status="active",
    )


@router.get("/sessions", response_model=list[MonitoringSessionOut])
async def get_sessions(admin: dict[str, Any] = Depends(verify_admin_token)):
    db = get_db()
    rows = await db["monitoringsessions"].find(
        {"adminEmail": admin["email"]}
    ).sort("startedAt", -1).to_list(50)
    return [
        MonitoringSessionOut(
            id=str(r["_id"]),
            floor_no=r["floorNo"],
            room_no=r["roomNo"],
            start_time=r.get("startTime", r.get("selectedTime", "")),
            end_time=r.get("endTime", ""),
            started_at=_ensure_utc(r["startedAt"]),
            status=r.get("status", "active"),
        )
        for r in rows
    ]
