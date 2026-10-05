from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, PlainSerializer, StringConstraints


def to_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def as_utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


# Incoming datetimes are normalised to naive UTC for storage.
UtcInput = Annotated[datetime, AfterValidator(to_naive_utc)]
# Stored naive-UTC datetimes are emitted with an explicit offset so browsers don't read them as local time.
UtcOutput = Annotated[datetime, PlainSerializer(as_utc_iso, return_type=str)]

Mobile = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9]{10,14}$")]
