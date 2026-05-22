from pydantic import BaseModel, model_validator
from datetime import datetime


class StudentStatsRequest(BaseModel):
    total_students: int
    focused_students: int

    @model_validator(mode="after")
    def check_focused_lte_total(self) -> "StudentStatsRequest":
        if self.total_students < 0 or self.focused_students < 0:
            raise ValueError("Values must be non-negative")
        if self.focused_students > self.total_students:
            raise ValueError("Focused students cannot exceed total students")
        return self


class StudentStatsOut(BaseModel):
    id: str
    total_students: int
    focused_students: int
    not_focused_students: int
    focus_percentage: float
    not_focus_percentage: float
    created_at: datetime
