# Map Tracking Platform

Full-stack real-time map tracking platform with:
- JWT auth
- Live location updates
- Route management
- Geofences
- POI search
- Shareable live location links

## Project Structure

- backend: Express + TypeScript + Supabase
- frontend: Next.js (App Router) + TypeScript + Tailwind
- docs: SQL schema and setup docs

## Quick Start

### 1) Database (Supabase)
1. Open Supabase SQL Editor.
2. Run `docs/database-schema.sql`.
3. Run `docs/database-seed.sql` (optional demo data).

### 2) Environment

#### Backend
Copy `backend/.env.example` to `backend/.env` and set:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- FRONTEND_URL

#### Frontend
Copy `frontend/.env.local.example` to `frontend/.env.local` and set:
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_MAPBOX_TOKEN

### 3) Install Dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

### 4) Run

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

Open: http://localhost:3000

## Key Routes

Frontend:
- `/` landing
- `/login`
- `/register`
- `/dashboard`
- `/shared/:token`

Backend API base:
- `http://localhost:5000/api`

## Notes

- Map rendering requires a valid Mapbox public token.
- Shared links depend on records in `shared_locations`.
- If auth fails, verify JWT secret and backend URL alignment.
