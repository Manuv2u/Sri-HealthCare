"""ReportService — upload, download URL generation, and file streaming."""
from __future__ import annotations

import logging
import uuid

from jose import ExpiredSignatureError, JWTError
from jose import jwt as jose_jwt
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.booking_repository import BookingRepository
from app.repositories.report_repository import ReportRepository
from app.services.storage_service import LocalStorage, get_storage_backend

logger = logging.getLogger("sri.report")

_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ReportRepository(db)
        self.booking_repo = BookingRepository(db)
        self.storage = get_storage_backend()

    async def upload_report(
        self,
        booking_id: uuid.UUID,
        file: UploadFile,
        uploaded_by: uuid.UUID,
        uploader_role: str,
    ) -> dict:
        # Validate file type and size
        if file.content_type not in ("application/pdf",):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error_code": "INVALID_FILE_TYPE", "message": "Only PDF files are allowed"},
            )

        file_bytes = await file.read()
        if len(file_bytes) > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error_code": "FILE_TOO_LARGE", "message": "File must be ≤ 20 MB"},
            )

        # Validate booking exists
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )

        # Upload to storage
        storage_key = f"reports/{booking_id}/{uuid.uuid4()}.pdf"
        await self.storage.upload(file_bytes, storage_key, "application/pdf")

        # Persist report record
        report = await self.repo.create(
            booking_id=booking_id,
            storage_key=storage_key,
            file_name=file.filename or "report.pdf",
            file_size_bytes=len(file_bytes),
            uploaded_by=uploaded_by,
            uploader_role=uploader_role,
        )

        # Update booking status to completed
        await self.booking_repo.update_status(booking_id, "completed", changed_by=uploaded_by)

        logger.info("report_uploaded: report_id=%s booking_id=%s", report.id, booking_id)

        return _report_to_dict(report)

    async def get_download_url(
        self,
        report_id: uuid.UUID,
        requesting_user_id: uuid.UUID,
        requesting_role: str,
    ) -> str:
        report = await self.repo.get_by_id(report_id)
        if report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "REPORT_NOT_FOUND", "message": "Report not found"},
            )

        # Verify ownership unless admin
        if requesting_role != "admin":
            booking = await self.booking_repo.get_by_id(report.booking_id)
            if booking is None or booking.user_id != requesting_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "ACCESS_DENIED", "message": "Access denied"},
                )

        url = await self.storage.generate_signed_url(
            key=report.storage_key,
            report_id=report.id,
            user_id=requesting_user_id,
        )

        logger.info(
            "report_download_url_generated: report_id=%s user_id=%s",
            report_id,
            requesting_user_id,
        )

        return url

    async def list_by_user(
        self, user_id: uuid.UUID, page: int, page_size: int
    ) -> dict:
        items, total = await self.repo.list_by_user(user_id, page=page, page_size=page_size)
        return {
            "items": [_report_to_dict(r) for r in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def list_by_booking(self, booking_id: uuid.UUID) -> list[dict]:
        items = await self.repo.list_by_booking(booking_id)
        return [_report_to_dict(r) for r in items]

    def validate_download_token(self, token: str) -> dict:
        """Validate JWT download token for local storage; return payload."""
        try:
            payload = jose_jwt.decode(
                token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
            return payload
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "TOKEN_EXPIRED", "message": "Download link has expired"},
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_TOKEN", "message": "Invalid download token"},
            )


def _report_to_dict(report) -> dict:  # type: ignore[no-untyped-def]
    return {
        "id": report.id,
        "booking_id": report.booking_id,
        "file_name": report.file_name,
        "file_size_bytes": report.file_size_bytes,
        "uploaded_by": report.uploaded_by,
        "uploader_role": report.uploader_role,
        "uploaded_at": report.uploaded_at,
        "retention_until": report.retention_until,
    }
