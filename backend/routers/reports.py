from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Report

router = APIRouter(prefix="/api/reports", tags=["reports"])


# ── Pydantic schemas ──────────────────────────────────────────────


class ReportOut(BaseModel):
    id: int
    client_id: int
    engagement_id: str
    version: int
    status: str
    source_data_path: Optional[str] = None
    partner_rating: Optional[int] = None
    partner_feedback: Optional[str] = None
    token_usage: Optional[int] = None
    model_used: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportDetail(ReportOut):
    report_markdown: Optional[str] = None
    analyst_notes: Optional[str] = None
    confidence_scores: Optional[dict] = None


class ReportUpdate(BaseModel):
    partner_rating: Optional[int] = None
    partner_feedback: Optional[str] = None
    status: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────


@router.get("/", response_model=list[ReportOut])
def list_reports(
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Report)
    if client_id is not None:
        q = q.filter(Report.client_id == client_id)
    if status is not None:
        q = q.filter(Report.status == status)
    return q.order_by(Report.created_at.desc()).all()


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}", response_model=ReportDetail)
def update_report(report_id: int, payload: ReportUpdate, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    data = payload.model_dump(exclude_unset=True)

    # Validate partner_rating is 1-5 if present
    if "partner_rating" in data and data["partner_rating"] is not None:
        if not 1 <= data["partner_rating"] <= 5:
            raise HTTPException(status_code=422, detail="partner_rating must be between 1 and 5")

    for key, value in data.items():
        setattr(report, key, value)

    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return None
