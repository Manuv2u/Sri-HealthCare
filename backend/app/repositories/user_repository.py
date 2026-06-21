"""User, Session, and FamilyMember repository classes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import FamilyMember, PasswordResetToken, Session, User


class UserRepository:
    """Async CRUD operations for the users table."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_user(
        self,
        name: str,
        phone: str | None,
        email: str | None,
        password_hash: str,
        role: str = "user",
    ) -> User:
        user = User(
            id=uuid.uuid4(),
            name=name,
            phone=phone,
            email=email,
            password_hash=password_hash,
            role=role,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.phone == phone, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(deleted_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def update(self, user_id: uuid.UUID, **fields: object) -> User | None:
        if not fields:
            return await self.get_by_id(user_id)
        await self.db.execute(
            update(User).where(User.id == user_id).values(**fields)
        )
        await self.db.flush()
        return await self.get_by_id(user_id)


class SessionRepository:
    """Async CRUD operations for the sessions table."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_session(
        self,
        user_id: uuid.UUID,
        refresh_token_hash: str,
        device_identifier: str | None,
        ip_address: str | None,
        expires_at: datetime,
    ) -> Session:
        session = Session(
            id=uuid.uuid4(),
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            device_identifier=device_identifier,
            ip_address=ip_address,
            last_seen_at=datetime.now(timezone.utc),
            expires_at=expires_at,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def get_by_refresh_token_hash(self, token_hash: str) -> Session | None:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Session).where(
                Session.refresh_token_hash == token_hash,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def revoke_session(self, session_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Session)
            .where(Session.user_id == user_id, Session.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def update_last_seen(self, session_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(last_seen_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def list_user_sessions(self, user_id: uuid.UUID) -> list[Session]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
        return list(result.scalars().all())


class FamilyMemberRepository:
    """Async CRUD operations for the family_members table."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        name: str,
        relationship: str,
        date_of_birth: object = None,
        gender: str | None = None,
    ) -> FamilyMember:
        member = FamilyMember(
            id=uuid.uuid4(),
            user_id=user_id,
            name=name,
            relationship_type=relationship,
            date_of_birth=date_of_birth,
            gender=gender,
        )
        self.db.add(member)
        await self.db.flush()
        await self.db.refresh(member)
        return member

    async def get_by_id(self, member_id: uuid.UUID) -> FamilyMember | None:
        result = await self.db.execute(
            select(FamilyMember).where(
                FamilyMember.id == member_id,
                FamilyMember.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[FamilyMember]:
        result = await self.db.execute(
            select(FamilyMember).where(
                FamilyMember.user_id == user_id,
                FamilyMember.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def count_by_user(self, user_id: uuid.UUID) -> int:
        members = await self.list_by_user(user_id)
        return len(members)

    async def update(self, member_id: uuid.UUID, **fields: object) -> FamilyMember | None:
        if not fields:
            return await self.get_by_id(member_id)
        await self.db.execute(
            update(FamilyMember).where(FamilyMember.id == member_id).values(**fields)
        )
        await self.db.flush()
        return await self.get_by_id(member_id)

    async def soft_delete(self, member_id: uuid.UUID) -> None:
        await self.db.execute(
            update(FamilyMember)
            .where(FamilyMember.id == member_id)
            .values(deleted_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def find_by_name_and_dob(
        self, user_id: uuid.UUID, name: str, date_of_birth: object
    ) -> FamilyMember | None:
        from sqlalchemy import func
        result = await self.db.execute(
            select(FamilyMember).where(
                FamilyMember.user_id == user_id,
                func.lower(FamilyMember.name) == func.lower(name),
                FamilyMember.date_of_birth == date_of_birth,
                FamilyMember.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()


# TODO(TEMP_PASSWORD_AUTH): Remove this class when replacing password-based auth
class PasswordResetTokenRepository:
    """Async CRUD for password_reset_tokens (temporary password auth)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: uuid.UUID, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        token = PasswordResetToken(
            id=uuid.uuid4(),
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        await self.db.flush()
        await self.db.refresh(token)
        return token

    async def get_valid_by_hash(self, token_hash: str) -> PasswordResetToken | None:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def mark_used(self, token_id: uuid.UUID) -> None:
        await self.db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.id == token_id)
            .values(used_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def invalidate_user_tokens(self, user_id: uuid.UUID) -> None:
        """Mark all unused tokens for a user as used."""
        await self.db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user_id, PasswordResetToken.used_at.is_(None))
            .values(used_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
