# 🗺️ Real-Time Map Tracking Platform

A full-stack Google Maps-style application with live location tracking, route planning, destination search, and turn-by-turn directions.

## 🌐 Live Demo

- **Frontend:** [https://frontend-lilac-six-41.vercel.app](https://frontend-lilac-six-41.vercel.app)
- **Backend API:** Deployed on Render.com

## ✨ Features

- 🔵 **Live Location Tracking** - Real-time blue dot with GPS accuracy ring
- 🗺️ **Interactive Map** - OpenStreetMap with Leaflet (no API key needed)
- 🔍 **Place Search** - Autocomplete search using Nominatim geocoding
- 🚗 **Route Planning** - Driving, walking & cycling directions via OSRM
- 📍 **Turn-by-Turn Directions** - Step-by-step navigation instructions
- 🛰️ **Satellite View** - Toggle between street and satellite layers
- 📡 **Real-Time WebSocket** - Live location streaming with Socket.IO
- 🔐 **JWT Authentication** - Secure user auth with bcrypt
- 📊 **Breadcrumb Trail** - Record and visualize your movement path
- 🏗️ **Geofence Alerts** - Create location-based boundaries
- 🔗 **Shareable Links** - Share your live location with anyone

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Map | Leaflet + react-leaflet + OpenStreetMap |
| Routing | OSRM (free, no API key) |
| Geocoding | Nominatim (free, no API key) |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Backend | Express.js + TypeScript |
| Database | Supabase (PostgreSQL + PostGIS) |
| Real-time | Socket.IO |
| Auth | JWT + bcryptjs |

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

## 🚀 Deployment

### Frontend (Vercel)
Already deployed. For redeployment:
```bash
cd frontend
vercel --prod
```

### Backend (Render.com)
1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **New** → **Blueprint**
3. Select the `realtime-map` repo
4. The `render.yaml` will auto-configure everything
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Vercel URL)

Or deploy manually: **New** → **Web Service** → set root to `backend/`, build: `npm install && npm run build`, start: `npm start`

## 📝 Notes

- Map uses **OpenStreetMap** tiles (free, no API key needed)
- Routing uses **OSRM** (free, no API key needed)
- Search uses **Nominatim** (free, no API key needed)
- If auth fails, verify JWT secret and backend URL alignment
- Shared links depend on records in `shared_locations` table
