from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Katalyst Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


from routers import clients
from routers import pipeline
from routers import library
from routers import reports
from routers import chat
from routers.uploads import router as uploads_router

app.include_router(clients.router)
app.include_router(pipeline.router)
app.include_router(library.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(uploads_router)
