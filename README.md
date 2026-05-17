# Food Rescue & Donation Platform

A complete full-stack starter application built with React, Tailwind CSS, Node.js, Express, MongoDB, Socket.io, and Leaflet.

## Structure

- `backend/` - Express server, MongoDB models, Socket.io, REST APIs.
- `frontend/` - React app with Tailwind, role-based dashboards, live map tracking.

## Setup

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp ../backend/.env.example ../backend/.env
   ```

4. Start the backend and frontend in separate terminals:
   ```bash
   cd backend
   npm run dev
   ```

   ```bash
   cd frontend
   npm run dev
   ```

## Notes

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`
- Google Maps is not required; Leaflet is used for location tracking.
- Replace `JWT_SECRET` and `MONGO_URI` in `.env` before deployment.
