---
name: Sawdust and Scents Full Stack E-commerce
overview: Create a professional monorepo-based e-commerce application with NestJS backend, React/MUI frontend, Keycloak authentication, dual database setup (PostgreSQL + MongoDB), full e-commerce features, Playwright testing, and CI/CD pipeline.
todos:
  - id: init-nx-workspace
    content: Initialize Nx workspace with React and NestJS presets, configure ESLint/Prettier/Husky
    status: in_progress
  - id: docker-setup
    content: Create docker-compose.yml for PostgreSQL, MongoDB, and Keycloak with environment configuration
    status: pending
  - id: ci-cd-pipeline
    content: Set up GitHub Actions workflow for build, test, lint, and deployment
    status: pending
    dependencies:
      - init-nx-workspace
  - id: nestjs-foundation
    content: Initialize NestJS app, configure modules, CORS, Swagger, and global pipes/filters
    status: pending
    dependencies:
      - init-nx-workspace
  - id: database-integration
    content: Set up TypeORM (PostgreSQL) and Mongoose (MongoDB) connections with database module
    status: pending
    dependencies:
      - docker-setup
      - nestjs-foundation
  - id: keycloak-auth
    content: Integrate Keycloak authentication with NestJS guards, decorators, and JWT validation
    status: pending
    dependencies:
      - nestjs-foundation
      - docker-setup
  - id: postgresql-models
    content: Create PostgreSQL models and services for Orders, Users, and PaymentTransactions
    status: pending
    dependencies:
      - database-integration
  - id: mongodb-models
    content: Create MongoDB schemas and services for Products, Categories, Inventory, and Analytics
    status: pending
    dependencies:
      - database-integration
  - id: cart-checkout-services
    content: Implement cart and checkout services with order orchestration
    status: pending
    dependencies:
      - postgresql-models
      - mongodb-models
  - id: backend-endpoints
    content: Create REST API endpoints for auth, products, cart, orders, checkout, and admin operations
    status: pending
    dependencies:
      - keycloak-auth
      - cart-checkout-services
  - id: react-foundation
    content: Initialize React app with MUI theme, routing, state management, and API client setup
    status: pending
    dependencies:
      - init-nx-workspace
  - id: keycloak-frontend
    content: Integrate Keycloak JavaScript adapter with React context and protected routes
    status: pending
    dependencies:
      - react-foundation
  - id: frontend-layout
    content: Create main layout with navigation, header, footer, cart icon, and responsive design
    status: pending
    dependencies:
      - keycloak-frontend
  - id: product-pages
    content: Build product catalog, listing, detail, and category pages with filters and search
    status: pending
    dependencies:
      - frontend-layout
  - id: cart-checkout-pages
    content: Implement shopping cart page, checkout flow, and order confirmation pages
    status: pending
    dependencies:
      - product-pages
  - id: user-account-pages
    content: Create user profile, order history, and order details pages
    status: pending
    dependencies:
      - cart-checkout-pages
  - id: backend-testing
    content: Set up Jest for backend unit and integration tests with test coverage
    status: pending
    dependencies:
      - backend-endpoints
  - id: frontend-testing
    content: Configure Jest + React Testing Library for component and hook tests
    status: pending
    dependencies:
      - react-foundation
  - id: playwright-e2e
    content: Set up Playwright with E2E tests for critical user flows (login, browse, cart, checkout)
    status: pending
    dependencies:
      - cart-checkout-pages
      - user-account-pages
  - id: documentation
    content: Create comprehensive README, API docs, development guide, and inline code documentation
    status: pending
  - id: production-readiness
    content: Configure production environments, error handling, logging, security hardening, and health checks
    status: pending
    dependencies:
      - backend-endpoints
      - playwright-e2e
---

# Sawdust and Scents - Full Stack E-commerce Application

## Architecture Overview

The application will be structured as an Nx monorepo with:

- **Backend**: NestJS API with PostgreSQL (orders, users, transactions) and MongoDB (products, inventory, analytics)
- **Frontend**: React application with Material-UI (MUI)
- **Auth**: Keycloak integration for authentication and authorization
- **Testing**: Playwright for E2E tests, Jest for unit/integration tests
- **CI/CD**: GitHub Actions pipeline
- **Infrastructure**: Docker Compose for local development (PostgreSQL, MongoDB, Keycloak)

## Implementation Steps

### Phase 1: Monorepo Foundation & Configuration

1. **Initialize Nx workspace**

- Create Nx workspace with React and NestJS presets
- Configure workspace structure: `apps/` and `libs/`
- Set up shared TypeScript configurations
- Configure ESLint, Prettier, and Husky for code quality

2. **Docker & Development Environment**

- Create `docker-compose.yml` for PostgreSQL, MongoDB, and Keycloak
- Set up environment variable management (`.env.example`, `.env.local`)
- Configure database connection strings and Keycloak configuration

3. **CI/CD Pipeline Setup**

- Create GitHub Actions workflow (`.github/workflows/ci.yml`)
- Configure build, test, and lint steps for both frontend and backend
- Set up dependency caching and matrix builds
- Add deployment workflows (separate for staging/production)

### Phase 2: Backend Foundation (NestJS)

4. **NestJS Application Setup**

- Initialize NestJS app in `apps/api`
- Configure module structure (auth, products, orders, cart, users, payments)
- Set up global pipes, filters, and interceptors
- Configure CORS for frontend integration
- Set up Swagger/OpenAPI documentation

5. **Database Integration**

- Set up TypeORM for PostgreSQL connection
- Set up Mongoose for MongoDB connection
- Create database module with connection management
- Configure migrations for PostgreSQL

6. **Keycloak Authentication Integration**

- Install and configure NestJS Keycloak adapter
- Create authentication guard and decorators
- Set up JWT token validation middleware
- Create user service for Keycloak user management
- Configure roles and permissions structure

### Phase 3: Backend Features - Database Models & Services

7. **PostgreSQL Models & Services (Orders, Users, Transactions)**

- User model (linked to Keycloak user ID)
- Order model with status tracking
- OrderItem model
- PaymentTransaction model
- Order service with CRUD operations
- Payment service (stripe/paypal integration skeleton)

8. **MongoDB Models & Services (Products, Inventory, Analytics)**

- Product schema (woodworking items and candles)
- Category schema
- Inventory schema
- Product reviews schema
- Product service with search, filtering, pagination
- Inventory management service
- Analytics service for product views/sales tracking

9. **Cart & Checkout Services**

- Cart service (session-based, migrate to user on login)
- Checkout service orchestrating order creation
- Cart items management
- Price calculation utilities

### Phase 4: Backend API Endpoints

10. **Authentication Endpoints**

    - Login/logout endpoints (Keycloak integration)
    - User profile endpoints
    - Token refresh endpoint

11. **Product Endpoints**

    - GET `/products` - List products with pagination, filtering, search
    - GET `/products/:id` - Product details
    - GET `/products/categories` - List categories
    - POST `/products` - Create product (admin only)
    - PUT `/products/:id` - Update product (admin only)
    - DELETE `/products/:id` - Delete product (admin only)

12. **Cart Endpoints**

    - GET `/cart` - Get user cart
    - POST `/cart/items` - Add item to cart
    - PUT `/cart/items/:id` - Update cart item quantity
    - DELETE `/cart/items/:id` - Remove cart item
    - DELETE `/cart` - Clear cart

13. **Order & Checkout Endpoints**

    - POST `/checkout` - Create order from cart
    - GET `/orders` - List user orders
    - GET `/orders/:id` - Order details
    - PUT `/orders/:id/status` - Update order status (admin)
    - POST `/orders/:id/payment` - Process payment

14. **Admin Endpoints**

    - GET `/admin/products` - Manage products
    - GET `/admin/orders` - Manage all orders
    - GET `/admin/analytics` - Sales analytics

### Phase 5: Frontend Foundation (React + MUI)

15. **React Application Setup**

    - Initialize React app in `apps/web`
    - Configure routing with React Router
    - Set up MUI theme with custom branding (wood/candle aesthetic)
    - Configure Material-UI components library
    - Set up state management (Context API or Zustand)
    - Configure API client (Axios) with interceptors

16. **Keycloak Frontend Integration**

    - Install Keycloak JavaScript adapter
    - Create authentication context/provider
    - Set up protected route components
    - Create login/logout components
    - Handle token refresh

17. **Layout & Navigation**

    - Create main app layout with header, sidebar, footer
    - Navigation menu with categories
    - Shopping cart icon with item count
    - User profile menu
    - Responsive design for mobile/tablet/desktop

### Phase 6: Frontend Features - Core Pages

18. **Product Catalog Pages**

    - Product listing page with filters (category, price, material)
    - Product search functionality
    - Product detail page with images, description, reviews
    - Category pages
    - Image gallery component

19. **Shopping Cart & Checkout**

    - Shopping cart page with item management
    - Checkout page (shipping info, payment method)
    - Order summary component
    - Order confirmation page

20. **User Account Pages**

    - User profile page
    - Order history page
    - Order details page with tracking
    - Address management

21. **Admin Dashboard (if applicable)**

    - Product management interface
    - Order management interface
    - Analytics dashboard

### Phase 7: Testing Setup

22. **Backend Testing**

    - Configure Jest for NestJS unit tests
    - Create test database setup/teardown
    - Write unit tests for services
    - Write integration tests for controllers
    - Set up test coverage reporting

23. **Frontend Testing**

    - Configure Jest + React Testing Library
    - Write component unit tests
    - Write hook tests
    - Set up test coverage

24. **Playwright E2E Testing**

    - Install and configure Playwright
    - Create test fixtures and page object models
    - Write E2E tests for critical user flows:
    - User registration/login
    - Browse products
    - Add to cart
    - Checkout flow
    - Order viewing
    - Configure test data management
    - Add visual regression testing (optional)

### Phase 8: Documentation & Polish

25. **Documentation**

    - Update README with setup instructions
    - Create API documentation (Swagger)
    - Add inline code documentation
    - Create development guide
    - Add deployment documentation

26. **Production Readiness**

    - Environment configuration for production
    - Error handling and logging setup
    - Performance optimization (caching, database indexing)
    - Security hardening (input validation, rate limiting)
    - Health check endpoints

## File Structure

```javascript
sawdust-and-scents/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/           # Keycloak integration
│   │   │   ├── products/       # Product management
│   │   │   ├── orders/         # Order processing
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── users/          # User management
│   │   │   ├── payments/       # Payment processing
│   │   │   ├── database/       # DB connections
│   │   │   └── common/         # Shared utilities
│   │   └── test/
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── features/       # Feature modules
│       │   ├── components/     # Shared components
│       │   ├── pages/          # Page components
│       │   ├── hooks/          # Custom hooks
│       │   ├── services/       # API services
│       │   ├── context/        # React context
│       │   └── theme/          # MUI theme
│       └── e2e/                # Playwright tests
├── libs/
│   ├── shared/                 # Shared types, utils
│   └── ui/                     # Shared UI components
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── nx.json
├── package.json
└── README.md
```