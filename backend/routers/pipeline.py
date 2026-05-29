import json
import os
import re
import subprocess
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Client, Report

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

KATALYST_ROOT = "/root/katalyst-advisory"
PROMPT_PATH = os.path.join(KATALYST_ROOT, "prompts", "deepseek-analysis.md")
FRAMEWORK_PATH = os.path.join(KATALYST_ROOT, "templates", "report-framework.md")
TECH_CATALOG_PATH = os.path.join(KATALYST_ROOT, "templates", "tech-catalog.md")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


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
def run_pipeline(request: PipelineRunRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    existing_count = (
        db.query(func.count(Report.id))
        .filter(Report.client_id == request.client_id)
        .scalar()
    )
    version = existing_count + 1

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

    background_tasks.add_task(_execute_pipeline, report.id)

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


def _execute_pipeline(report_id: int):
    """Background task: run DeepSeek analysis and update the report."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return
        client = db.query(Client).filter(Client.id == report.client_id).first()
        if not client:
            return

        # Load prompts and source data
        system_prompt = _read_file(PROMPT_PATH)
        framework = _read_file(FRAMEWORK_PATH)
        tech_catalog = _read_file(TECH_CATALOG_PATH)
        source_text = _read_file(report.source_data_path)

        if not source_text:
            raise ValueError(f"Source file empty: {report.source_data_path}")

        user_message = (
            "Analyze this client data and produce a diagnostic report following the framework. "
            "Here is the report framework, the tech catalog, and the client data.\n\n"
            f"## Report Framework\n\n{framework}\n\n"
            f"## Tech Solutions Catalog\n\n{tech_catalog}\n\n"
            f"## Client Data\n\nClient: {client.name}\nEngagement: {report.engagement_id}\n\n{source_text}"
        )

        payload = {
            "model": report.model_used or "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
            "max_tokens": 8192,
            "stream": False,
        }

        curl_cmd = [
            "curl", "-s", DEEPSEEK_URL,
            "-H", "Content-Type: application/json",
            "-H", f"Authorization: Bearer {DEEPSEEK_API_KEY}",
            "-d", json.dumps(payload),
        ]

        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=300)
        response = json.loads(result.stdout)

        if "error" in response:
            raise RuntimeError(f"DeepSeek API error: {response['error']}")

        content = response["choices"][0]["message"]["content"]
        token_usage = response.get("usage", {}).get("total_tokens", 0)

        # Extract confidence scores from Analyst Notes
        confidence = _extract_confidence(content)

        # Extract analyst notes section
        analyst_notes = ""
        match = re.search(r"## Analyst Notes\s*\n(.*?)(?:\n---|\Z)", content, re.DOTALL)
        if match:
            analyst_notes = match.group(0)

        report.report_markdown = content
        report.analyst_notes = analyst_notes
        report.confidence_scores = confidence
        report.token_usage = token_usage
        report.status = "ready"
        db.commit()

    except Exception as e:
        traceback.print_exc()
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if report:
                report.status = "error"
                report.analyst_notes = f"Pipeline error: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _read_file(path: str) -> str:
    """Read file, handling PDF extraction."""
    if not os.path.exists(path):
        return ""
    if path.endswith(".pdf"):
        try:
            import pymupdf
            doc = pymupdf.open(path)
            return "\n".join(page.get_text() for page in doc)
        except Exception:
            return ""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def _extract_confidence(content: str) -> dict:
    """Extract HIGH/MEDIUM/LOW confidence ratings from Analyst Notes."""
    scores = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for line in content.split("\n"):
        for level in ("HIGH", "MEDIUM", "LOW"):
            if level in line.upper() and "|" in line:
                scores[level] += 1
    return scores
