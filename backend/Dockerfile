FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Shell form on purpose — needs $PORT to be substituted at container start.
# Cloud Run, Azure Container Apps, and App Runner all inject $PORT and
# expect the app to bind to it; this falls back to 8000 for local `docker run`.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
