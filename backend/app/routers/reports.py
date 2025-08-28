from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import os
import shutil
import uuid
from ..database import get_db
from ..models import Report
from ..schemas import ReportCreate, ReportResponse, ReportStatusUpdate

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=ReportResponse)
async def create_report(
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    subject: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """Create a new harassment report with file uploads"""
    try:
        # Handle file uploads
        file_metadata = []
        for file in files:
            if file.filename:
                # Generate unique filename
                file_id = str(uuid.uuid4())
                file_extension = os.path.splitext(file.filename)[1]
                unique_filename = f"{file_id}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, unique_filename)

                # Save file to disk
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                # Store file metadata
                file_metadata.append({
                    "id": file_id,
                    "name": file.filename,
                    "filename": unique_filename,
                    "size": os.path.getsize(file_path),
                    "type": file.content_type or "application/octet-stream"
                })

        # Create new report
        db_report = Report(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            description=description,
            files=file_metadata,
            status="pending"
        )

        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        return db_report
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create report: {str(e)}"
        )

@router.get("/", response_model=List[ReportResponse])
async def get_all_reports(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all reports with optional filtering"""
    try:
        query = db.query(Report).order_by(desc(Report.created_at))

        # Filter by status if provided
        if status_filter and status_filter != "all":
            query = query.filter(Report.status == status_filter)

        # Search across multiple fields if search term provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Report.name.ilike(search_term)) |
                (Report.email.ilike(search_term)) |
                (Report.subject.ilike(search_term)) |
                (Report.description.ilike(search_term))
            )

        reports = query.all()
        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}"
        )

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific report by ID"""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch report: {str(e)}"
        )

@router.patch("/{report_id}/status", response_model=ReportResponse)
async def update_report_status(
    report_id: int,
    status_update: ReportStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update the status of a report"""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        report.status = status_update.status
        db.commit()
        db.refresh(report)

        return report
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update report status: {str(e)}"
        )

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """Delete a report by ID"""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        db.delete(report)
        db.commit()

        return {"message": "Report deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete report: {str(e)}"
        )

@router.get("/{report_id}/files/{file_id}")
async def download_file(
    report_id: int,
    file_id: str,
    db: Session = Depends(get_db)
):
    """Download a file attached to a report"""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        # Find the file in the report's files
        target_file = None
        for file in report.files:
            if file.get('id') == file_id:
                target_file = file
                break

        if not target_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        file_path = os.path.join(UPLOAD_DIR, target_file['filename'])

        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on server"
            )

        return FileResponse(
            path=file_path,
            filename=target_file['name'],
            media_type=target_file['type']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )

@router.get("/stats/summary")
async def get_report_stats(db: Session = Depends(get_db)):
    """Get report statistics summary"""
    try:
        total_reports = db.query(Report).count()
        pending_reports = db.query(Report).filter(Report.status == "pending").count()
        reviewed_reports = db.query(Report).filter(Report.status == "reviewed").count()
        resolved_reports = db.query(Report).filter(Report.status == "resolved").count()

        return {
            "total": total_reports,
            "pending": pending_reports,
            "reviewed": reviewed_reports,
            "resolved": resolved_reports
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch report statistics: {str(e)}"
        )
