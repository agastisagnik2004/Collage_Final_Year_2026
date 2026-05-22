from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_db, disconnect_db
from app.routes import auth, camera, schedule, stats, admin, detect
from app.detection import start_detection, stop_detection


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await start_detection()
    yield
    stop_detection()
    await disconnect_db()


app = FastAPI(title="Classroom Monitor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(camera.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(detect.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")


@app.get("/api/healthz")
async def healthz():
    return {"status": "ok"}
