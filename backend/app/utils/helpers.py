import uuid
import re
from datetime import date, datetime


def generate_uuid() -> str:
    return str(uuid.uuid4())


def format_datetime(dt: datetime) -> str:
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def calculate_bmi(height_cm: float, weight_kg: float) -> float:
    if not height_cm or not weight_kg or height_cm <= 0:
        return 0.0
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def calculate_age(dob: date) -> int:
    today = date.today()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def sanitize_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
