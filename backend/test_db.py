#!/usr/bin/env python3
"""
Test script to verify database configuration
"""
import os
from app.database import DATABASE_URL, engine
from app.models import Base

print(f"Current working directory: {os.getcwd()}")
print(f"Database URL: {DATABASE_URL}")
print(f"Engine URL: {engine.url}")

# Create tables
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")

# Check if database file exists
if "sqlite" in str(DATABASE_URL):
    db_file = str(DATABASE_URL).replace("sqlite:///", "")
    if db_file.startswith("./"):
        db_file = db_file[2:]
    print(f"Database file path: {db_file}")
    print(f"Database file exists: {os.path.exists(db_file)}")
    if os.path.exists(db_file):
        print(f"Database file size: {os.path.getsize(db_file)} bytes")
