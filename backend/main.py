from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import intake, ocr, summary, rbac, abdm
from config import settings

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for MediKiosk — Smart AYUSH & General OPD Case-Taking System (PS 047)"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(intake.router, prefix=settings.API_PREFIX)
app.include_router(ocr.router, prefix=settings.API_PREFIX)
app.include_router(summary.router, prefix=settings.API_PREFIX)
app.include_router(rbac.router, prefix=settings.API_PREFIX)
app.include_router(abdm.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "sih_team": "f society",
        "ps_id": "PS 047",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
