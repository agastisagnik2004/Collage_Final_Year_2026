from pydantic import BaseModel


class ScheduleRequest(BaseModel):
    date: str
    day: str
    time: str
    room_no: str


class ScheduleOut(BaseModel):
    id: str
    date: str
    day: str
    time: str
    room_no: str
    user_id: str
