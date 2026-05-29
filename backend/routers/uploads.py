import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException

UPLOAD_DIR = "/root/katalyst-dashboard/data/uploads"
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

os.makedirs(UPLOAD_DIR, exist_ok=True)


def extract_text_preview(file_path: str, original_filename: str, max_chars: int = 500) -> str:
    """Extract the first max_chars characters of text from a file."""
    ext = os.path.splitext(original_filename)[1].lower()

    if ext == ".pdf":
        import pymupdf
        doc = pymupdf.open(file_path)
        try:
            text = ""
            for page in doc:
                text += page.get_text()
                if len(text) >= max_chars:
                    break
        finally:
            doc.close()
        return text[:max_chars]

    # .md and .txt — plain text
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read(max_chars)


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    # Validate extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Generate a UUID-based safe filename, preserving the original extension
    file_id = uuid.uuid4()
    safe_name = f"{file_id.hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, safe_name)

    # Save the uploaded file
    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    # Extract text preview
    try:
        text_preview = extract_text_preview(saved_path, file.filename)
    except Exception as e:
        text_preview = f"(preview unavailable: {e})"

    return {
        "file_id": file_id.hex[:8],
        "filename": file.filename,
        "saved_path": saved_path,
        "text_preview": text_preview,
    }
