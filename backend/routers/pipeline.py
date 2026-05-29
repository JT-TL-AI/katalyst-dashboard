from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Client, Report

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class PipelineRunRequest(BaseModel):
    client_id: int
    source_file: str
    engagement_id: str
    model: str = "deepseek-chat"


class PipelineRunResponse(BaseModel):
    report_id: int
    status: str


class PipelineStatusResponse(BaseModel):
    report_id: int
    status: str
    version: int


@router.post("/run", response_model=PipelineRunResponse)
def run_pipeline(request: PipelineRunRequest, db: Session = Depends(get_db)):
    # Verify client exists
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Count existing reports for this client to determine version
    existing_count = (
        db.query(func.count(Report.id))
        .filter(Report.client_id == request.client_id)
        .scalar()
    )
    version = existing_count + 1

    # Create the pipeline Report record
    report = Report(
        client_id=request.client_id,
        engagement_id=request.engagement_id,
        version=version,
        status="analyzing",
        source_data_path=request.source_file,
        model_used=request.model,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return PipelineRunResponse(report_id=report.id, status=report.status)


@router.get("/status/{report_id}", response_model=PipelineStatusResponse)
def get_pipeline_status(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return PipelineStatusResponse(
        report_id=report.id,
        status=report.status,
        version=report.version,
    )
