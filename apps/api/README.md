# API Application

NestJS-based REST API for Sawdust and Scents e-commerce platform.

## Overview

This is the backend API server that handles:
- Product catalog management
- Order processing and fulfillment
- User authentication and authorization
- Shopping cart functionality
- Payment processing
- HR/Admin dashboard features
- ADP integration for employee management

## Tech Stack

- **Framework**: NestJS
- **Databases**: 
  - PostgreSQL (relational data: users, orders)
  - MongoDB (document data: products, inventory)
- **Authentication**: Keycloak (OAuth 2.0 / OpenID Connect)
- **ORM**: 
  - TypeORM (PostgreSQL)
  - Mongoose (MongoDB)

## Project Structure

```
src/
├── app/                    # Root application module
├── modules/
│   ├── auth/              # Authentication & authorization (Keycloak)
│   ├── cart/              # Shopping cart and checkout logic
│   ├── database/          # Database configuration (Postgres + Mongo)
│   ├── management/        # Admin dashboard & HR (ADP integration)
│   ├── orders/            # Order processing and shipping
│   ├── payments/          # Payment processing
│   ├── products/          # Product catalog and inventory
│   └── users/             # User management
└── main.ts                # Application entry point
```

## Environment Variables

Required in `.env.local`:

```bash
# Application
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sawdust_scents

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=admin
MONGO_PASSWORD=admin
MONGO_DB=sawdust_scents

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sawdust-scents
KEYCLOAK_CLIENT_ID=api-client
KEYCLOAK_CLIENT_SECRET=your-secret

# ADP Integration
ADP_CLIENT_ID=your-adp-client-id
ADP_CLIENT_SECRET=your-adp-client-secret
ADP_TOKEN_URL=https://accounts.adp.com/auth/oauth/v2/token
ADP_API_URL=https://api.adp.com/hr/v2

# Shippo
SHIPPO_API_KEY=your-shippo-api-key
```

## Running the Application

```bash
# Development
nx serve api

# Production build
nx build api

# Run tests
nx test api

# E2E tests
nx e2e
```

## API Documentation

The API follows RESTful conventions. Main endpoints:

- `/auth/*` - Authentication and authorization
- `/products/*` - Product catalog
- `/cart/*` - Shopping cart operations
- `/orders/*` - Order management
- `/payments/*` - Payment processing
- `/management/*` - Admin dashboard and HR

## Module Dependencies

```
AppModule
├── ConfigModule (global)
├── DatabaseModule
│   ├── TypeORM (PostgreSQL)
│   └── Mongoose (MongoDB)
├── AuthModule (Keycloak)
├── UsersModule
├── ProductsModule
├── CartModule
├── OrdersModule
├── PaymentsModule
└── ManagementModule
```

## Development Notes

- All database changes should be reflected in entity/schema files
- Authentication is required by default (use `@Public()` decorator to bypass)
- TypeORM synchronize is enabled in development only
- See individual module READMEs for detailed information

## Related Documentation

- See `/docs/Development Steps/` for detailed implementation guides
- Each module has its own README with specific details


