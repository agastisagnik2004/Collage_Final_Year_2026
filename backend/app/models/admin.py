from pydantic import BaseModel, EmailStr
from datetime import datetime


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    otp: str


class StartMonitoringRequest(BaseModel):
    floor_no: str
    room_no: str
    start_time: str
    end_time: str


class MonitoringSessionOut(BaseModel):
    id: str
    floor_no: str
    room_no: str
    start_time: str
    end_time: str
    started_at: datetime
    status: str
