"""Packages router."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import require_roles
from app.schemas.packages import PackageCreate, PackageListResponse, PackageOut, PackageUpdate
from app.services.package_service import PackageService

router = APIRouter(prefix="/packages", tags=["packages"])


class _TestIdsBody(BaseModel):
    test_ids: list[uuid.UUID]


@router.post("", response_model=PackageOut, status_code=201)
async def create_package(
    body: PackageCreate,
    _admin: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> PackageOut:
    svc = PackageService(db)
    result = await svc.create_package(
        name=body.name,
        description=body.description,
        original_price=body.original_price,
        discounted_price=body.discounted_price,
        test_ids=body.test_ids,
    )
    return PackageOut.model_validate(result)


@router.get("", response_model=PackageListResponse)
async def list_packages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
) -> PackageListResponse:
    svc = PackageService(db)
    result = await svc.list_packages(page=page, page_size=page_size)
    return PackageListResponse(
        items=[PackageOut.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get("/{package_id}", response_model=PackageOut)
async def get_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> PackageOut:
    svc = PackageService(db)
    result = await svc.get_package(package_id)
    return PackageOut.model_validate(result)


@router.put("/{package_id}", response_model=PackageOut)
async def update_package(
    package_id: uuid.UUID,
    body: PackageUpdate,
    _admin: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> PackageOut:
    svc = PackageService(db)
    result = await svc.update_package(package_id, **body.model_dump(exclude_none=True))
    return PackageOut.model_validate(result)


@router.delete("/{package_id}", status_code=204)
async def delete_package(
    package_id: uuid.UUID,
    _admin: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    svc = PackageService(db)
    await svc.delete_package(package_id)


@router.post("/{package_id}/tests", response_model=PackageOut)
async def add_tests_to_package(
    package_id: uuid.UUID,
    body: _TestIdsBody,
    _admin: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> PackageOut:
    svc = PackageService(db)
    result = await svc.add_tests(package_id, body.test_ids)
    return PackageOut.model_validate(result)


@router.delete("/{package_id}/tests", response_model=PackageOut)
async def remove_tests_from_package(
    package_id: uuid.UUID,
    body: _TestIdsBody,
    _admin: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> PackageOut:
    svc = PackageService(db)
    result = await svc.remove_tests(package_id, body.test_ids)
    return PackageOut.model_validate(result)
