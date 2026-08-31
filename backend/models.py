from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    registration_mode = Column(String, default="both")  # admin_only | self_register | both

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)  # Null for Super Admin
    role_id = Column(Integer, ForeignKey("roles.id"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    status = Column(String, default="active")  # active | pending_approval | suspended

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    name = Column(String, nullable=False)
    is_protected = Column(Boolean, default=False)  # True for Super Admin, Hospital Admin

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "patient_intake", "doctor_dashboard"

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    module_id = Column(Integer, ForeignKey("modules.id"))
    can_view = Column(Boolean, default=True)
    can_create = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)

class PatientSession(Base):
    __tablename__ = "patient_sessions"
    id = Column(String, primary_key=True, index=True)
    abha_id = Column(String, index=True)
    patient_name = Column(String, nullable=False)
    department = Column(String, default="ayush")
    answers_json = Column(JSON)
    red_flags = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    status = Column(String, default="pending_review")  # pending_review | reviewed | completed

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer)
    module_id = Column(Integer)
    action = Column(String)
    changed_by = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
