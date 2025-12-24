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
  - id: management-backend
    content: Create management dashboard backend module with role-based access, dashboard service, inventory management, analytics, and audit logging
    status: pending
    dependencies:
      - keycloak-auth
      - postgresql-models
      - mongodb-models
  - id: chatbot-backend
    content: Create chatbot backend module with message processing, conversation history, and optional AI integration
    status: pending
    dependencies:
      - mongodb-models
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
  - id: management-dashboard
    content: Create management dashboard frontend with role-based access, inventory management, order management, analytics, and reports
    status: pending
    dependencies:
      - keycloak-frontend
      - frontend-layout
      - management-backend
  - id: chatbot-frontend
    content: Create chatbot widget component with chat interface, message history, and integration with chatbot API
    status: pending
    dependencies:
      - frontend-layout
      - chatbot-backend
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
    content: Set up Playwright with E2E tests for critical user flows (login, browse, cart, checkout, management dashboard access, chatbot interactions)
    status: pending
    dependencies:
      - cart-checkout-pages
      - user-account-pages
      - management-dashboard
      - chatbot-frontend
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

# Sawdust & Scents - Full Stack E-commerce Application

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
- Management audit log model
- Order service with CRUD operations
- Payment service (stripe/paypal integration skeleton)
- Management audit service

8. **MongoDB Models & Services (Products, Inventory, Analytics)**

- Product schema (woodworking items and candles)
- Category schema
- Inventory schema
- Product reviews schema
- Chatbot conversation history schema
- Product service with search, filtering, pagination
- Inventory management service
- Analytics service for product views/sales tracking
- Chatbot conversation service

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

15. **Management Dashboard Endpoints** (Auth-protected, Admin/Manager roles only)

    - GET `/management/dashboard` - Get dashboard overview (sales, orders, inventory metrics)
    - GET `/management/inventory` - Get inventory status and low-stock alerts
    - GET `/management/orders` - Get all orders with filtering, search, and pagination
    - GET `/management/analytics` - Get detailed sales analytics and reports
    - GET `/management/users` - Get user management data (admin only)
    - POST `/management/inventory/update` - Update inventory levels
    - PUT `/management/orders/:id/status` - Update order status
    - GET `/management/reports` - Generate and download reports (CSV, PDF)
    - GET `/management/audit-logs` - Get audit logs for management actions

16. **Chatbot Endpoints**

    - POST `/chatbot/message` - Send message to chatbot and get response
    - GET `/chatbot/history` - Get conversation history (authenticated users)
    - POST `/chatbot/feedback` - Submit feedback on chatbot response
    - GET `/chatbot/suggestions` - Get suggested questions/topics
    - POST `/chatbot/clear-history` - Clear conversation history (authenticated users)

### Phase 5: Backend Features - Management & Chatbot

17. **Management Dashboard Service**

    - Create management module with role-based access guards
    - Dashboard service aggregating sales, orders, and inventory data
    - Inventory management service with low-stock alerts
    - Analytics service for generating reports
    - Audit logging for all management actions
    - Role-based access control (admin, manager roles)

18. **Chatbot Service**

    - Create chatbot module and service
    - AI chatbot name: **Rowan** (can be changed later)
    - Implement rule-based chatbot logic (intent recognition, response generation)
    - Optional: Integrate with AI service (OpenAI, etc.) for advanced responses
    - Product information retrieval for product-related queries
    - Order status lookup for order-related queries
    - Conversation history storage in MongoDB
    - Feedback collection and analysis

### Phase 6: Frontend Foundation (React + MUI)

19. **React Application Setup**

    - Initialize React app in `apps/web`
    - Configure routing with React Router
    - Set up MUI theme with custom branding (wood/candle aesthetic)
    - Configure Material-UI components library
    - Set up state management (Context API or Zustand)
    - Configure API client (Axios) with interceptors

20. **Keycloak Frontend Integration**

    - Install Keycloak JavaScript adapter
    - Create authentication context/provider
    - Set up protected route components
    - Create login/logout components
    - Handle token refresh
    - Implement role-based route protection

21. **Layout & Navigation**

    - Create main app layout with header, sidebar, footer
    - Navigation menu with categories
    - Shopping cart icon with item count
    - User profile menu with role-based menu items
    - Management dashboard link (visible only for admin/manager roles)
    - Responsive design for mobile/tablet/desktop

### Phase 7: Frontend Features - Core Pages

22. **Product Catalog Pages**

    - Product listing page with filters (category, price, material)
    - Product search functionality
    - Product detail page with images, description, reviews
    - Category pages
    - Image gallery component

23. **Shopping Cart & Checkout**

    - Shopping cart page with item management
    - Checkout page (shipping info, payment method)
    - Order summary component
    - Order confirmation page

24. **User Account Pages**

    - User profile page
    - Order history page
    - Order details page with tracking
    - Address management

25. **Management Dashboard** (Auth-protected, Admin/Manager roles only)

    - Dashboard overview page with key metrics (sales, orders, inventory alerts)
    - Inventory management interface with real-time stock levels and low-stock alerts
    - Order management interface with filtering, search, status updates, and bulk actions
    - Sales analytics and reporting with charts, graphs, and date range filters
    - User management interface (admin only) with user list, roles, and permissions
    - Report generation and export functionality (CSV, PDF)
    - Audit log viewer for tracking management actions
    - Role-based access control with Keycloak integration
    - Responsive design for mobile/tablet/desktop

26. **Chatbot Feature**

    - Chatbot widget component (floating button or embedded in footer)
    - Chat interface with message history and typing indicators
    - Integration with backend chatbot service
    - Support for product inquiries (search, details, availability)
    - Order status inquiries
    - FAQ and general support questions
    - Conversation history for authenticated users
    - Feedback mechanism for chatbot responses (thumbs up/down)
    - Suggested questions/quick replies
    - Smooth animations and transitions
    - Mobile-responsive chat interface

### Phase 8: Testing Setup

27. **Backend Testing**

    - Configure Jest for NestJS unit tests
    - Create test database setup/teardown
    - Write unit tests for services
    - Write integration tests for controllers
    - Set up test coverage reporting
    - Test management dashboard endpoints with role-based access
    - Test chatbot service with various message types

28. **Frontend Testing**

    - Configure Jest + React Testing Library
    - Write component unit tests
    - Write hook tests
    - Set up test coverage
    - Test management dashboard components with role-based rendering
    - Test chatbot widget and interactions

29. **Playwright E2E Testing**

    - Install and configure Playwright
    - Create test fixtures and page object models
    - Write E2E tests for critical user flows:
    - User registration/login
    - Browse products
    - Add to cart
    - Checkout flow
    - Order viewing
    - Management dashboard access (role-based)
    - Chatbot interactions and responses
    - Configure test data management
    - Add visual regression testing (optional)

### Phase 9: Documentation & Polish

30. **Documentation**

    - Update README with setup instructions
    - Create API documentation (Swagger) including management and chatbot endpoints
    - Add inline code documentation
    - Create development guide
    - Add deployment documentation
    - Document role-based access control setup
    - Document chatbot configuration and customization

31. **Production Readiness**

    - Environment configuration for production
    - Error handling and logging setup
    - Performance optimization (caching, database indexing)
    - Security hardening (input validation, rate limiting)
    - Health check endpoints
    - Management dashboard audit logging
    - Chatbot rate limiting and abuse prevention

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
│   │   │   ├── management/     # Management dashboard API (auth-protected)
│   │   │   ├── chatbot/        # Chatbot API endpoints
│   │   │   ├── database/       # DB connections
│   │   │   └── common/         # Shared utilities
│   │   └── test/
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── features/       # Feature modules
│       │   │   ├── products/   # Product catalog features
│       │   │   ├── cart/       # Shopping cart features
│       │   │   ├── orders/     # Order management features
│       │   │   ├── auth/       # Authentication features
│       │   │   ├── management/ # Admin/Management dashboard (auth-protected)
│       │   │   └── chatbot/    # Chatbot feature for customer support
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