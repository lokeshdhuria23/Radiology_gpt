from uuid import UUID
from typing import Optional, Tuple, List
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.patient import Patient, PatientDoctorAssignment


class PatientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_doctor(self, doctor_id: UUID, offset: int = 0, limit: int = 20, search: Optional[str] = None) -> Tuple[List[Patient], int]:
        query = (
            select(Patient)
            .join(PatientDoctorAssignment, Patient.id == PatientDoctorAssignment.patient_id)
            .where(PatientDoctorAssignment.doctor_id == doctor_id)
            .where(PatientDoctorAssignment.assignment_status == "active")
        )
        if search:
            query = query.where(
                or_(Patient.full_name.ilike(f"%{search}%"), Patient.patient_identifier.ilike(f"%{search}%"))
            )
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        result = await self.session.execute(query.offset(offset).limit(limit).order_by(Patient.created_at.desc()))
        return list(result.scalars().all()), total

    async def list_all(self, offset: int = 0, limit: int = 20, search: Optional[str] = None) -> Tuple[List[Patient], int]:
        query = select(Patient)
        if search:
            query = query.where(or_(Patient.full_name.ilike(f"%{search}%"), Patient.patient_identifier.ilike(f"%{search}%")))
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        result = await self.session.execute(query.offset(offset).limit(limit).order_by(Patient.created_at.desc()))
        return list(result.scalars().all()), total

    async def get_by_id(self, patient_id: UUID) -> Optional[Patient]:
        result = await self.session.execute(select(Patient).where(Patient.id == patient_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Patient:
        dob = kwargs.get("date_of_birth")
        if isinstance(dob, str):
            from datetime import datetime, date
            dob_clean = dob.strip()
            parsed_date = None
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y", "%d/%m/%Y", "%m/%d/%Y"):
                try:
                    parsed_date = datetime.strptime(dob_clean, fmt).date()
                    break
                except ValueError:
                    pass
            kwargs["date_of_birth"] = parsed_date or date(1980, 1, 1)
        patient = Patient(**kwargs)
        self.session.add(patient)
        await self.session.flush()
        await self.session.refresh(patient)
        return patient

    async def update(self, patient_id: UUID, **kwargs) -> Optional[Patient]:
        result = await self.session.execute(select(Patient).where(Patient.id == patient_id))
        patient = result.scalar_one_or_none()
        if patient:
            for key, value in kwargs.items():
                if value is not None:
                    setattr(patient, key, value)
            await self.session.flush()
            await self.session.refresh(patient)
        return patient

    async def check_doctor_access(self, doctor_id: UUID, patient_id: UUID) -> bool:
        result = await self.session.execute(
            select(PatientDoctorAssignment).where(
                PatientDoctorAssignment.doctor_id == doctor_id,
                PatientDoctorAssignment.patient_id == patient_id,
                PatientDoctorAssignment.assignment_status == "active",
            )
        )
        return result.scalar_one_or_none() is not None

    async def assign_doctor(self, patient_id: UUID, doctor_id: UUID) -> PatientDoctorAssignment:
        assignment = PatientDoctorAssignment(patient_id=patient_id, doctor_id=doctor_id)
        self.session.add(assignment)
        await self.session.flush()
        return assignment
