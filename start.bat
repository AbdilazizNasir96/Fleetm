@echo off
set DATABASE_URL=postgresql://postgres:abdi0377AAA@db.wutbbjwerdsvzlutxshn.supabase.co:5432/postgres
set SESSION_SECRET=my-super-secret-32-chars-minimum
set PORT=8080
set NODE_ENV=development

echo Building API server...
pnpm --filter @workspace/api-server build

echo Starting API server on port 8080...
start "API Server" cmd /k pnpm --filter @workspace/api-server start

timeout /t 3 /nobreak >nul

echo Starting frontend on port 5173...
start "Frontend" cmd /k pnpm --filter @workspace/app dev

echo.
echo API: http://localhost:8080
echo Frontend: http://localhost:5173
echo.
pause
