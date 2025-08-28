from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from decouple import config

from app.database import get_db, engine
from app.models import Base
from app.routers import auth, chat, reports
from app.services.auth_service import get_current_user

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Chatbot API",
    description="Backend API for AI Chatbot with Gemini integration",
    version="1.0.0"
)

# CORS middleware
allowed_origins = [
    config("FRONTEND_URL", default="http://localhost:5173"),
]

# Add additional allowed origins from environment variable
additional_origins = config("ADDITIONAL_ALLOWED_ORIGINS", default="").split(",")
allowed_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(reports.router, tags=["reports"])

@app.get("/")
async def root():
    return {"message": "AI Chatbot API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
