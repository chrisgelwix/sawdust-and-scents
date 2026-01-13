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

# Run tests (unit tests are co-located with source files)
nx test api

# E2E tests (API, integration, Playwright, NIST)
nx e2e

# Linting
nx lint api

# Linting with auto-fix
nx lint api --fix
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

## Code Quality & Linting

### Linting Configuration

This project uses ESLint with TypeScript support. The lint target is configured to allow warnings but fail on errors:

```bash
# Lint without stopping on warnings
nx lint api

# Lint with strict mode (warnings = errors)
nx lint api --max-warnings=0
```

**CI/CD Behavior:** GitHub Actions runs `nx affected -t lint` which uses the `--max-warnings=-1` flag, allowing warnings to pass but failing on errors.

### Code Quality Standards

- ✅ **Zero circular dependencies** between modules
- ✅ **Clean imports** - no unused imports
- ✅ **Type safety** - minimal use of `any` (only for external API responses)
- ✅ **Single Responsibility** - each module has one clear purpose
- ✅ **Separation of Concerns** - controllers, services, and entities are properly separated

### Recent Improvements (January 2026)

- Fixed all TypeScript linting errors
- Removed unused imports across all modules
- Improved type inference (removed redundant type annotations)
- Enhanced module documentation
- Cleaned up authentication guard usage

### Acceptable `any` Types

The following uses of `any` are intentional and acceptable:

- **External API responses** (ADP, Shippo, Keycloak) - dynamic structures
- **Request/response handlers** - where Express types are too broad
- **Payroll data** - complex nested structures from ADP

## Testing Strategy

### Unit Tests

- **Location**: Co-located with source files (e.g., `user.service.spec.ts` next to `user.service.ts`)
- **Command**: `nx test api`
- **Coverage Goal**: 80%+

### E2E Tests

- **Location**: `apps/e2e/`
- **Types**: API tests, Integration tests, Playwright (UI), NIST security tests
- **Command**: `nx e2e`

See the [E2E Testing README](../e2e/README.md) for comprehensive testing documentation.

## Development Notes

- All database changes should be reflected in entity/schema files
- Authentication is required by default (use `@Public()` decorator to bypass)
- TypeORM synchronize is enabled in development only
- See individual module READMEs for detailed information
- Unit tests stay with source files; integration/E2E tests go in `apps/e2e/`

## Related Documentation

- See `/docs/Development Steps/` for detailed implementation guides
- Each module has its own README with specific details
