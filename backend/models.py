from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    revenue = Column(String)
    employee_count = Column(Integer)
    location = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    reports = relationship("Report", back_populates="client", order_by="Report.version.desc()")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    engagement_id = Column(String, nullable=False)
    version = Column(Integer, default=1)
    status = Column(String, default="draft")
    source_data_path = Column(String)
    report_markdown = Column(Text)
    analyst_notes = Column(Text)
    confidence_scores = Column(JSON)
    partner_rating = Column(Integer)
    partner_feedback = Column(Text)
    token_usage = Column(Integer)
    model_used = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="reports")
    chat_sessions = relationship("ChatSession", back_populates="report")


class LibraryItem(Base):
    __tablename__ = "library"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    source = Column(String)
    industry = Column(String)
    report_type = Column(String)
    content_markdown = Column(Text)
    key_insights = Column(Text)
    tags = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    title = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    report = relationship("Report", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ChatSession", back_populates="messages")
