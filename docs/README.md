# Routes-connect

<p align="center">
  <strong>Smart travel planning for city-to-city journeys in India</strong>
</p>

<p align="center">
  Routes-connect brings route comparison, destination discovery, weather updates, safety tools, AI trip planning, and travel assistance into one platform.
</p>

<p align="center">
  <a href="demo.html">Live Demo Page</a> •
  <a href="docs/demo/routes-connect-demo.webm">Demo Video</a> •
  <a href="docs/screenshots/home.png">Screenshots</a>
</p>

## Overview
Routes-connect is a full-stack travel planning web application built to make trip preparation simpler, faster, and more organized. Instead of switching between separate websites for route comparison, destination research, weather, food, safety, and trip support, users can work through everything in one experience.

The platform is designed for students, tourists, solo travelers, families, and anyone who wants a cleaner workflow for planning journeys between cities.

## Demo

### Demo Page
- Browser showcase: [demo.html](demo.html)

### Demo Video
- Guided walkthrough: [docs/demo/routes-connect-demo.webm](docs/demo/routes-connect-demo.webm)

### Screenshots

| Home | Login |
| --- | --- |
| ![Home Page](docs/screenshots/home.png) | ![Login Page](docs/screenshots/login.png) |

| Route Planner | Services |
| --- | --- |
| ![Route Planner Page](docs/screenshots/route-planner.png) | ![Services Page](docs/screenshots/services.png) |

## Why This Project Matters
Travel planning often becomes scattered across many platforms. Routes-connect solves that by combining the most useful planning tasks into one product:

- compare train, bus, cab, and route options
- explore places and destination information
- check weather and travel context
- use AI assistance for trip planning
- manage budget, safety, and previous trip history

## Core Features

### Travel Planning
- Route planning between cities
- Train, bus, cab, and flight mode comparison
- Route map display
- Weather snapshot for destination cities

### Destination Discovery
- Hotels, restaurants, food corners, and famous places
- Hidden gems and destination discovery
- Tourist-place cards with destination photos
- AI-based destination suggestion cards

### Smart Assistance
- AI trip planning support
- Smart budget splitter
- Safety dashboard
- Shareable trip links

### User Experience
- Login and signup flow
- Profile image upload and zoom preview
- Previous trip review and local trip history
- Newsletter subscription flow

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Progressive Web App support through `manifest.webmanifest` and `sw.js`

### Backend
- Node.js
- Express.js
- REST API architecture
- Dotenv for environment-variable management
- Multer for file upload handling
- Bcryptjs for password hashing
- CORS for cross-origin support

### Database
- MongoDB
- Mongoose

MongoDB is used for storing application data when database mode is enabled. Mongoose is used to define schemas and manage backend interaction with MongoDB.

### Third-Party APIs and Services
- OpenAI API for AI-based travel suggestions and trip planning
- Pexels API for travel and destination images
- Geoapify API for location-related support
- Google Maps API for geocoding and route-related location features
- Open-Meteo API for weather information
- EmailJS for newsletter email delivery

## Project Structure

### Root Files
- `server.js`  
  Main backend entry point. It configures middleware, APIs, integrations, and static file serving.

- `index.js`  
  Entry reference file for the Node project.

- `package.json`  
  Contains dependencies, scripts, and project metadata.

- `.env`  
  Stores private environment variables and API keys.

- `.env.example`  
  Reference template for required environment variables.

### Backend Folders
- `routes/`  
  Express route modules for backend features.

- `controllers/`  
  Controller logic for grouped request handling.

- `services/`  
  Reusable backend service logic.

- `models/`  
  Mongoose schemas and data models.

- `scripts/`  
  Utility scripts such as train-data seeding.

- `tests/`  
  Automated test files.

### Frontend Files
- `public/index.html`  
  Main landing page and home interface.

- `public/about.html`  
  About page.

- `public/services.html`  
  Services page.

- `public/login.html`  
  Login and signup page.

- `public/route.html`  
  Route results page with travel tools and trip details.

- `public/script.js`  
  Main JavaScript for the home page.

- `public/route.js`  
  JavaScript logic for route page tools and travel details.

- `public/login.js`  
  JavaScript for authentication and profile image handling.

- `public/style.css`  
  Main stylesheet for the home page and shared design.

- `public/route.css`  
  Styles for the route results page.

- `public/login.css`  
  Styles for the login page.

- `public/theme.js`  
  Theme-related frontend logic.

- `public/home-logic.js`  
  Shared utility logic for the home page route form.

- `public/sw.js`  
  Service worker for basic PWA support.

- `public/manifest.webmanifest`  
  Web app manifest for installable behavior.

- `public/img/`  
  Project images and static visual assets.

- `public/uploads/`  
  Uploaded user profile images and related assets.

## Installation and Setup

1. Install dependencies:

```bash
npm install
```

2. Create the environment file:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Add your keys and configuration in `.env`.

4. Start the project:

```bash
npm start
```

## Environment Variables
Use `.env.example` as the base reference.

Important variables include:
- `PORT`
- `USE_MONGO`
- `MONGO_URI`
- `GOOGLE_MAPS_API_KEY`
- `GEOAPIFY_API_KEY`
- `PEXELS_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_PRIVATE_KEY`

## Available Scripts
- `npm start`  
  Starts the backend server.

- `npm test`  
  Runs automated tests.

- `npm run seed`  
  Seeds train-related data.

- `npm run seed:trains`  
  Seeds train-related data.

## Testing and CI
This project includes test files inside the `tests/` folder. A GitHub Actions workflow is also configured in `.github/workflows/ci.yml` to run CI tasks.

The CI pipeline currently performs:
- dependency installation
- automated test execution

## Benefits
- Centralized travel planning
- Better decision-making through route comparison
- User-friendly and modern interface
- Helpful for personal and family trip planning
- Expandable architecture for future features
- Combines utility, discovery, and personalization
- Supports AI-enhanced planning

## Future Improvements
- Real-time booking integration for trains, buses, cabs, and flights
- Live seat availability and fare tracking
- Payment gateway integration
- Notification and reminder system
- Better admin dashboard for analytics and management
- More advanced saved itineraries
- Personalized recommendations based on travel history
- Multilingual support
- Better offline support for PWA users
- More detailed review and rating system
- Real-time traffic and delay updates

## Conclusion
Routes-connect is a practical travel-planning platform that combines route comparison, travel assistance, destination discovery, AI support, and user convenience features in one application. It works well as both a real-world utility project and a strong full-stack portfolio or academic submission because it demonstrates frontend development, backend APIs, database integration, authentication, third-party API usage, and UI/UX design together.
