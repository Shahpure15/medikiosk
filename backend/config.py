import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "MediKiosk — AYUSH & OPD Patient Intake System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./medikiosk.db")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

settings = Settings()
