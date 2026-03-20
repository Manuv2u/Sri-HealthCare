"""Package service — business logic for package management."""
from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.test import Package, Test
from app.repositories.package_repository import PackageRepository
from app.services.test_service import _effective_price, _test_to_dict


def _package_to_dict(pkg: Package, tests: list[Test]) -> dict:
    return {
        "id": pkg.id,
        "name": pkg.name,
        "description": pkg.description,
        "original_price": pkg.original_price,
        "discounted_price": pkg.discounted_price,
        "is_active": pkg.is_active,
        "tests": [_test_to_dict(t) for t in tests],
    }


class PackageService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = PackageRepository(db)

    async def create_package(
        self,
        name: str,
        description: str | None,
        original_price: Decimal,
        discounted_price: Decimal,
        test_ids: list[uuid.UUID] | None = None,
    ) -> dict:
        pkg = await self.repo.create(
            name=name,
            description=description,
            original_price=original_price,
            discounted_price=discounted_price,
        )
        if test_ids:
            await self.repo.add_tests(pkg.id, test_ids)
        tests = await self.repo.get_active_tests(pkg.id)
        return _package_to_dict(pkg, tests)

    async def get_package(self, package_id: uuid.UUID) -> dict:
        pkg = await self.repo.get_by_id(package_id)
        if pkg is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PACKAGE_NOT_FOUND", "message": "Package not found"},
            )
        tests = await self.repo.get_active_tests(package_id)
        return _package_to_dict(pkg, tests)

    async def list_packages(self, page: int, page_size: int) -> dict:
        items, total = await self.repo.list(active_only=True, page=page, page_size=page_size)
        result_items = []
        for pkg in items:
            tests = await self.repo.get_active_tests(pkg.id)
            result_items.append(_package_to_dict(pkg, tests))
        return {"items": result_items, "total": total, "page": page, "page_size": page_size}

    async def update_package(self, package_id: uuid.UUID, **fields: object) -> dict:
        pkg = await self.repo.get_by_id(package_id)
        if pkg is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PACKAGE_NOT_FOUND", "message": "Package not found"},
            )
        updated = await self.repo.update(package_id, **fields)
        tests = await self.repo.get_active_tests(package_id)
        return _package_to_dict(updated, tests)  # type: ignore[arg-type]

    async def delete_package(self, package_id: uuid.UUID) -> None:
        pkg = await self.repo.get_by_id(package_id)
        if pkg is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PACKAGE_NOT_FOUND", "message": "Package not found"},
            )
        await self.repo.soft_delete(package_id)

    async def add_tests(self, package_id: uuid.UUID, test_ids: list[uuid.UUID]) -> dict:
        pkg = await self.repo.get_by_id(package_id)
        if pkg is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PACKAGE_NOT_FOUND", "message": "Package not found"},
            )
        await self.repo.add_tests(package_id, test_ids)
        tests = await self.repo.get_active_tests(package_id)
        return _package_to_dict(pkg, tests)

    async def remove_tests(self, package_id: uuid.UUID, test_ids: list[uuid.UUID]) -> dict:
        pkg = await self.repo.get_by_id(package_id)
        if pkg is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PACKAGE_NOT_FOUND", "message": "Package not found"},
            )
        await self.repo.remove_tests(package_id, test_ids)
        tests = await self.repo.get_active_tests(package_id)
        return _package_to_dict(pkg, tests)
