from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.report import ClinicalReport, ReportReview


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> ClinicalReport:
        now = datetime.now(timezone.utc)
        if "generated_at" not in kwargs:
            kwargs["generated_at"] = now
        if "updated_at" not in kwargs:
            kwargs["updated_at"] = now
        report = ClinicalReport(**kwargs)
        self.session.add(report)
        await self.session.flush()
        await self.session.refresh(report)
        return report

    async def get_by_id(self, report_id: UUID) -> Optional[ClinicalReport]:
        result = await self.session.execute(select(ClinicalReport).where(ClinicalReport.id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            # Also fallback to looking up by workflow_id if a workflow_id was passed
            wf_res = await self.session.execute(
                select(ClinicalReport).where(ClinicalReport.workflow_id == report_id).order_by(ClinicalReport.generated_at.desc())
            )
            report = wf_res.scalars().first()
        return report

    async def update(self, report_id: UUID, **kwargs) -> Optional[ClinicalReport]:
        result = await self.session.execute(select(ClinicalReport).where(ClinicalReport.id == report_id))
        report = result.scalar_one_or_none()
        if report:
            for k, v in kwargs.items():
                if v is not None:
                    setattr(report, k, v)
            await self.session.flush()
            await self.session.refresh(report)
        return report

    async def list_for_patient(self, patient_id: UUID) -> List[ClinicalReport]:
        result = await self.session.execute(
            select(ClinicalReport).where(ClinicalReport.patient_id == patient_id).order_by(ClinicalReport.generated_at.desc())
        )
        return list(result.scalars().all())

    async def create_review(self, **kwargs) -> ReportReview:
        review = ReportReview(**kwargs)
        self.session.add(review)
        await self.session.flush()
        await self.session.refresh(review)
        return review

    async def get_reviews(self, report_id: UUID) -> List[ReportReview]:
        result = await self.session.execute(
            select(ReportReview).where(ReportReview.report_id == report_id).order_by(ReportReview.created_at.desc())
        )
        return list(result.scalars().all())
