# Travel Project

A full-stack travel planning app to compare train/bus/cab options, view nearby places, and build trip plans.

## Features
- Route planning by `from` and `to` city
- Mode comparison: train, bus, cab
- Weather endpoint with fallback support
- Explore endpoints for hotels, famous places, hidden gems, and food corners
- Auth endpoints for signup/signin
- AI-assisted destination suggestions and trip plans (when OpenAI key is configured)

## Tech Stack
- Node.js
- Express
- Mongoose (optional, controlled by `USE_MONGO`)
- Plain HTML/CSS/JS frontend

## Project Structure
- `server.js` - main app wiring and API routes
- `models/` - schemas and route handlers
- `controller/` - explore data controller
- `public/` - frontend pages and assets
- `scripts/` - data seeding scripts
- `tests/` - automated tests

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env
```
On Windows PowerShell:
```powershell
Copy-Item .env.example .env
```
3. Fill required keys in `.env`.
4. Start app:
```bash
npm start
```

## Environment Variables
Use `.env.example` as reference.

Required/commonly used:
- `PORT`
- `USE_MONGO`
- `MONGO_URI` (required when `USE_MONGO=true`)
- `GOOGLE_MAPS_API_KEY` (optional but recommended for map/place features)
- `GEOAPIFY_API_KEY` (optional fallback/provider)
- `OPENAI_API_KEY` (optional for AI features)
- `PEXELS_API_KEY` (optional for images)

## Scripts
- `npm start` - start server
- `npm test` - run automated tests
- `npm run seed` - seed train data
- `npm run seed:trains` - seed train data

## Testing
This project includes a starter health check test:
- Validates `GET /health` returns `{ "status": "ok" }`.

Run:
```bash
npm test
```

## CI
GitHub Actions workflow is configured at:
- `.github/workflows/ci.yml`

It runs on pushes and pull requests to `main`:
1. `npm ci`
2. `npm test`
