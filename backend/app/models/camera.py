from typing import Literal
from pydantic import BaseModel, field_validator
from datetime import datetime


class CameraStatusRequest(BaseModel):
    camera_number: int
    status: Literal["focused", "not_focused"]

    @field_validator("camera_number")
    @classmethod
    def valid_camera(cls, v: int) -> int:
        if v < 1 or v > 4:
            raise ValueError("camera_number must be between 1 and 4")
        return v


class CameraStatusOut(BaseModel):
    id: str
    camera_number: int
    status: str
    updated_at: datetime
