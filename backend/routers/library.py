from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import LibraryItem

router = APIRouter(prefix="/api/library", tags=["library"])


# ── Pydantic schemas ──────────────────────────────────────────────

class LibraryItemCreate(BaseModel):
    title: str
    source: Optional[str] = None
    industry: Optional[str] = None
    report_type: Optional[str] = None
    content_markdown: Optional[str] = None
    key_insights: Optional[str] = None
    tags: Optional[str] = None


class LibraryItemOut(BaseModel):
    id: int
    title: str
    source: Optional[str] = None
    industry: Optional[str] = None
    report_type: Optional[str] = None
    content_markdown: Optional[str] = None
    key_insights: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/", response_model=list[LibraryItemOut])
def list_library(
    industry: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(LibraryItem)

    if industry:
        q = q.filter(LibraryItem.industry == industry)

    if tags:
        # Match any of the comma-separated tags against the tags field
        filters = []
        for t in tags.split(","):
            t = t.strip()
            if t:
                filters.append(LibraryItem.tags.contains(t))
        if filters:
            from sqlalchemy import or_
            q = q.filter(or_(*filters))

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (LibraryItem.title.contains(pattern)) |
            (LibraryItem.key_insights.contains(pattern))
        )

    return q.order_by(LibraryItem.created_at.desc()).all()


@router.post("/", response_model=LibraryItemOut, status_code=201)
def create_library_item(payload: LibraryItemCreate, db: Session = Depends(get_db)):
    item = LibraryItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=LibraryItemOut)
def get_library_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(LibraryItem).filter(LibraryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")
    return item


@router.delete("/{item_id}", status_code=204)
def delete_library_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(LibraryItem).filter(LibraryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")
    db.delete(item)
    db.commit()
    return None
