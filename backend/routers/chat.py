from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import ChatSession, ChatMessage, Report

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ── Pydantic schemas ──────────────────────────────────────────────

class SessionCreate(BaseModel):
    report_id: int
    title: str


class MessageCreate(BaseModel):
    content: str


class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: int
    report_id: int
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionWithMessages(SessionOut):
    messages: list[MessageOut]


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    """Create a chat session tied to a report."""
    # Verify report exists
    report = db.query(Report).filter(Report.id == payload.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    session = ChatSession(report_id=payload.report_id, title=payload.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(report_id: int = Query(...), db: Session = Depends(get_db)):
    """List all chat sessions for a report."""
    return (
        db.query(ChatSession)
        .filter(ChatSession.report_id == report_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


@router.get("/sessions/{session_id}", response_model=SessionWithMessages)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Load session with all messages ordered by created_at."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # The messages relationship already orders by ChatMessage.created_at,
    # but we explicitly eager-load to avoid lazy-load issues.
    return session


@router.post("/sessions/{session_id}/message", response_model=list[MessageOut], status_code=201)
def send_message(session_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    """Send a message. Creates user message + two placeholder AI responses."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # 1) Create user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)

    # 2) Create DeepSeek placeholder
    deepseek_msg = ChatMessage(
        session_id=session_id,
        role="deepseek",
        content="[DeepSeek response pending]",
    )
    db.add(deepseek_msg)

    # 3) Create Claude placeholder
    claude_msg = ChatMessage(
        session_id=session_id,
        role="claude",
        content="[Claude response pending]",
    )
    db.add(claude_msg)

    db.commit()

    # Refresh all three so they have ids and timestamps
    db.refresh(user_msg)
    db.refresh(deepseek_msg)
    db.refresh(claude_msg)

    return [user_msg, deepseek_msg, claude_msg]
