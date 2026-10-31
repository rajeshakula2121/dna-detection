@echo off
echo =====================================================================
echo  Starting GenomicsAI — Bioinformatics Platform (Backend + Frontend)
echo =====================================================================
echo.

start "GenomicsAI Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

start "GenomicsAI Frontend (Next.js)" cmd /k "cd /d "%~dp0web" && npm run dev"

echo Services started!
echo - Backend API:  http://127.0.0.1:8000 (Swagger Docs: http://127.0.0.1:8000/docs)
echo - Web Frontend: http://localhost:3000
echo.
pause

