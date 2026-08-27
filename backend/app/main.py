"""
Application entrypoint.

Exposes:
- GET /health
- POST /webhooks/razorpay
- POST /recovery/workflow/{payment_id}
- POST /recovery/approval/{payment_id}
- POST /recovery/approval/{approval_id}/approve
- POST /recovery/approval/{approval_id}/reject
- POST /recovery/approval/{approval_id}/execute
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.routes import health, webhooks, recovery, approval


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(recovery.router)
app.include_router(approval.router)
