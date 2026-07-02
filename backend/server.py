"""FastAPI application entrypoint (env stub for the preview environment).

The Elite Empressions production backend is an Express + Mongoose service located
at `/app/express_server`. This FastAPI service is a minimal template kept for the
supervisor process wiring inside this preview container; it exposes a small
`/api/status` endpoint used for health probes.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR: Path = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url: str = os.environ["MONGO_URL"]
client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Create the main app without a prefix
app: FastAPI = FastAPI()

# Create a router with the /api prefix
api_router: APIRouter = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    """Health-check record persisted to MongoDB."""

    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    """Payload accepted by `POST /api/status`."""

    client_name: str


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate) -> StatusCheck:
    status_obj = StatusCheck(**payload.model_dump())

    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc: Dict[str, Any] = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()

    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks() -> List[Dict[str, Any]]:
    # Exclude MongoDB's _id field from the query results
    status_checks: List[Dict[str, Any]] = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check.get("timestamp"), str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])

    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger: logging.Logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
