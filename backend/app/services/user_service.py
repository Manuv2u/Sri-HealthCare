"""UserService: profile management and family members."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import FamilyMemberRepository, UserRepository

_MAX_FAMILY_MEMBERS = 10


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.family_repo = FamilyMemberRepository(db)

    async def get_profile(self, user_id: uuid.UUID):
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "USER_NOT_FOUND", "message": "User not found"},
            )
        return user

    async def update_profile(self, user_id: uuid.UUID, **fields):
        allowed = {k: v for k, v in fields.items() if k in ("name", "email", "date_of_birth", "gender") and v is not None}
        user = await self.user_repo.update(user_id, **allowed)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "USER_NOT_FOUND", "message": "User not found"},
            )
        return user

    async def get_family_members(self, user_id: uuid.UUID):
        return await self.family_repo.list_by_user(user_id)

    async def add_family_member(
        self,
        user_id: uuid.UUID,
        name: str,
        relationship: str,
        date_of_birth=None,
        gender: str | None = None,
    ):
        count = await self.family_repo.count_by_user(user_id)
        if count >= _MAX_FAMILY_MEMBERS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "FAMILY_MEMBER_LIMIT_EXCEEDED",
                    "message": f"Cannot add more than {_MAX_FAMILY_MEMBERS} family members",
                },
            )
        return await self.family_repo.create(
            user_id=user_id,
            name=name,
            relationship=relationship,
            date_of_birth=date_of_birth,
            gender=gender,
        )

    async def update_family_member(self, user_id: uuid.UUID, member_id: uuid.UUID, **fields):
        member = await self.family_repo.get_by_id(member_id)
        if member is None or member.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "FAMILY_MEMBER_NOT_FOUND", "message": "Family member not found"},
            )
        allowed = {k: v for k, v in fields.items() if k in ("name", "relationship", "date_of_birth", "gender") and v is not None}
        return await self.family_repo.update(member_id, **allowed)

    async def delete_family_member(self, user_id: uuid.UUID, member_id: uuid.UUID) -> None:
        member = await self.family_repo.get_by_id(member_id)
        if member is None or member.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "FAMILY_MEMBER_NOT_FOUND", "message": "Family member not found"},
            )
        await self.family_repo.soft_delete(member_id)
