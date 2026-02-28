# Map Tracking Setup

## 1) Environment files

### Frontend
Create .env.local from example:
- Copy frontend/.env.local.example -> frontend/.env.local
- Set NEXT_PUBLIC_MAPBOX_TOKEN
- Confirm NEXT_PUBLIC_API_URL

### Backend
Create .env from example:
- Copy backend/.env.example -> backend/.env
- Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET

## 2) Install dependencies

Frontend: npm install (in frontend)
Backend: npm install (in backend)

## 3) Database
Apply schema from docs/database-schema.sql in Supabase.
Optional: apply docs/database-seed.sql for demo data.

## 4) Run
Backend: npm run dev (in backend)
Frontend: npm run dev (in frontend)

Open http://localhost:3000

## 5) Notes
- Map requires Mapbox token.
- Auth endpoints: /api/auth/register and /api/auth/login.
- Shared links: /shared/{token}
- Demo share token (if seeded): /shared/demo-share-token
- Demo user (if seeded): driver@map.local
