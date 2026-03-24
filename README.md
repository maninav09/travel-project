# Routes-connect

## Introduction
Routes-connect is a full-stack travel planning web application built to help users plan city-to-city travel in India more easily. The project brings route comparison, destination discovery, weather updates, nearby places, and trip assistance into one platform so users do not need to switch between multiple websites or apps.

The main goal of this project is to reduce travel-planning confusion by giving users a cleaner workflow for choosing a route, comparing transport options, exploring tourist destinations, and organizing trip-related information in one place.

## Project Description
This project is designed for travelers who want a smarter way to plan trips between cities. A user can search a route, compare train, bus, and cab options, explore destinations, view famous places, check weather conditions, and use extra tools such as AI trip planning, budget splitting, safety guidance, and previous trip reviews.

Routes-connect combines practical travel planning with a modern interface. It is useful for students, tourists, families, solo travelers, and anyone who wants a faster and simpler way to prepare for a trip.

## Technologies Used

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

## Development Approach
This project was developed as a full-stack web application by combining a static frontend with a Node.js and Express backend. The frontend handles user interaction, page rendering, and client-side features, while the backend manages routing logic, API calls, authentication, travel data processing, and optional database operations.

The project was developed module by module. First, the travel search flow and route pages were created. After that, destination discovery, explore sections, weather, authentication, newsletter support, and AI-based features were integrated. The application was then improved with profile image handling, responsive pages, modern UI sections, and route-related extra tools.

## Main Features
- Route planning between cities
- Train, bus, cab, and flight mode comparison
- Route map display
- Weather snapshot for destination cities
- Hotels, restaurants, food corners, and famous places
- Hidden gems and destination discovery
- AI trip planning support
- AI-based destination suggestion cards
- Tourist-place cards with destination photos
- Smart budget splitter
- Safety dashboard
- Previous trip review and local trip history
- Login and signup flow
- Profile image upload and zoom preview
- Newsletter subscription flow
- Shareable trip links

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

## Backend Folder Structure
- `routes/`  
  Contains Express route modules for different backend features.

- `controllers/`  
  Contains controller logic for handling grouped requests.

- `services/`  
  Contains reusable backend service logic.

- `models/`  
  Contains Mongoose schemas and data models.

- `scripts/`  
  Contains utility scripts such as train-data seeding.

- `tests/`  
  Contains automated test files.

## Frontend Folder Structure
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
  Stores project images and static visual assets.

- `public/uploads/`  
  Stores uploaded user profile images and related assets.

## How the Project Helps People
Routes-connect helps people by making travel planning easier and faster. Instead of checking routes on one site, hotels on another, weather on another, and tourist places somewhere else, the user can perform all major planning tasks in a single platform.

It is helpful because:
- It saves travel planning time.
- It reduces confusion while selecting travel modes.
- It helps users compare practical options before a trip.
- It gives destination ideas and tourist-place recommendations.
- It supports better decision-making with weather and safety information.
- It improves convenience with profile, review, and sharing features.

## Benefits of the Project
- Centralized travel planning
- Better decision-making through route comparison
- User-friendly and modern interface
- Helpful for personal and family trip planning
- Expandable architecture for future features
- Combines utility, discovery, and personalization
- Supports AI-enhanced planning

## Future Improvements
The project can be improved further by adding:
- Real-time booking integration for trains, buses, cabs, and flights
- Live seat availability and fare tracking
- Payment gateway integration
- Notification and reminder system
- Better admin dashboard for analytics and management
- Saved user itineraries in a more advanced format
- Personalized recommendations based on travel history
- Multilingual support
- Better offline support for PWA users
- More detailed review and rating system
- Real-time traffic and delay updates

## How the Project Can Be Developed Further
This project can grow into a more advanced travel assistant platform. The next stage of development can focus on:
- stronger personalization
- more reliable external API handling
- deeper AI features
- production-ready authentication
- better scalability for larger user traffic

Future development can also include converting the frontend into a component-based framework such as React, improving database design for production use, and adding dashboards for both users and administrators.

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

## Conclusion
Routes-connect is a practical travel-planning project that combines route comparison, travel assistance, destination discovery, AI support, and user convenience features in one application. It is useful as both a real-world travel utility and a strong full-stack academic project because it demonstrates frontend, backend, database, API integration, authentication, and UI/UX development together.
