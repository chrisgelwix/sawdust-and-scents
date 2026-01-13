# Web Application

React-based frontend for Sawdust and Scents e-commerce platform.

## Overview

This is the customer-facing web application for browsing products, managing cart, and placing orders.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router
- **Styling**: CSS Modules
- **Testing**: Jest + React Testing Library

## Project Structure

```
src/
├── app/
│   ├── app.tsx           # Main application component
│   ├── app.module.css    # Application styles
│   └── nx-welcome.tsx    # Welcome component
├── assets/               # Static assets (images, fonts)
├── main.tsx             # Application entry point
└── styles.css           # Global styles
```

## Running the Application

```bash
# Development server
nx serve web

# Production build
nx build web

# Run tests
nx test web

# Preview production build
nx preview web
```

## Environment Variables

Create `.env.local` in the web app directory:

```bash
VITE_API_URL=http://localhost:3000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=sawdust-scents
VITE_KEYCLOAK_CLIENT_ID=web-client
```

## Development Status

🚧 **Under Development**

Currently using Nx welcome screen. The following features are planned:

- [ ] Product catalog browsing
- [ ] Product search and filtering
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] User authentication (Keycloak)
- [ ] Order history
- [ ] User profile management

## API Integration

The web app will communicate with the API at `/apps/api/` using REST endpoints.

## Build Output

Production builds are output to:
- `dist/web/` - Static files ready for deployment
- Can be served by any static file server (Nginx, Apache, S3, etc.)

## Deployment

The application is designed to be deployed as static files to:
- AWS S3 + CloudFront
- Azure Static Web Apps
- Netlify
- Vercel

See `/docs/Development Steps/34-AWS Cloud Infrastructure and Deployment.md` for deployment guides.


