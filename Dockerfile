# Dockerfile for FastAPI backend
# Use official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application source
COPY backend ./backend

# Expose the FastAPI port (uvicorn default)
EXPOSE 8000

# Command to run the app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
