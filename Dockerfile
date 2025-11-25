FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Railway assigns port dynamically via $PORT env var
# Default to 8000 for local development
ENV PORT=8000
EXPOSE $PORT

# Start command - uses $PORT from environment
CMD uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT
