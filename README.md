# Sawdust and Scents - E-commerce Platform

A full-stack e-commerce application built as a monorepo to showcase modern web development practices, enterprise architecture patterns, and production-ready code quality.

## 🎯 Application Overview

**Sawdust and Scents** is an e-commerce platform specializing in handcrafted woodworking items and artisanal candles. The application demonstrates enterprise-level architecture with a microservices-oriented approach, dual database strategy, and comprehensive authentication/authorization.

### Business Intent
- Provide a seamless shopping experience for customers browsing and purchasing woodworking products and candles
- Support administrative operations for inventory management, order processing, and sales analytics
- Offer customer support through an integrated chatbot feature
- Provide role-based management dashboard for administrators and managers
- Showcase professional development practices suitable for enterprise applications

### Technical Intent
This project serves as a **technical portfolio piece** demonstrating:
- **Monorepo architecture** using Nx for scalable code organization
- **Modern full-stack development** with TypeScript, NestJS, and React
- **Enterprise authentication** using Keycloak for SSO/OAuth capabilities
- **Polyglot persistence** with strategic database selection (PostgreSQL + MongoDB)
- **Comprehensive testing** including unit, integration, and E2E tests
- **CI/CD best practices** with automated pipelines
- **Production-ready patterns** including error handling, logging, and security

---

## 🏗️ Architecture Overview

The application follows a **modular monorepo architecture** that separates concerns while maintaining tight integration:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + MUI)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Products   │  │     Cart     │  │    Orders    │ │
│  │   Catalog    │  │  Management  │  │   History    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│              Keycloak Auth (JWT Tokens)                 │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│          Backend (NestJS REST API)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Auth      │  │   Products   │  │    Orders    │ │
│  │  (Keycloak)  │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│  ┌───────────────────────┼───────────────────────────┐ │
│  │     PostgreSQL        │        MongoDB            │ │
│  │  (Orders, Users,      │  (Products, Inventory,    │ │
│  │   Transactions)       │   Analytics)              │ │
│  └───────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Each domain (products, orders, auth) is encapsulated in its own module
2. **Database Segregation**: Transactional data in PostgreSQL, flexible document data in MongoDB
3. **Type Safety**: Full TypeScript across frontend and backend with shared type definitions
4. **API-First**: RESTful API design with OpenAPI/Swagger documentation
5. **Security**: Keycloak-based authentication with role-based access control (RBAC)

---

## 🛠️ Tech Stack

### **Monorepo Management**
- **Nx** - Monorepo build system with:
  - Dependency graph management
  - Intelligent caching for faster builds
  - Code generation capabilities
  - Unified linting and testing

### **Frontend**
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - Production-ready component library
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors for auth
- **Zustand** (or Context API) - State management

### **Backend**
- **NestJS** - Progressive Node.js framework with:
  - Modular architecture
  - Dependency injection
  - Decorator-based routing
  - Built-in support for TypeORM and Mongoose
- **TypeScript** - Type-safe backend development
- **TypeORM** - PostgreSQL ORM with migrations
- **Mongoose** - MongoDB object modeling
- **Swagger/OpenAPI** - API documentation
- **Chatbot Service** - Rule-based or AI-powered chatbot (OpenAI integration optional)

### **Authentication & Authorization**
- **Keycloak** - Enterprise identity and access management:
  - Single Sign-On (SSO)
  - OAuth 2.0 / OpenID Connect
  - Role-based access control
  - User federation capabilities

### **Databases**
- **PostgreSQL** - Relational database for:
  - User accounts (linked to Keycloak)
  - Orders and order items
  - Payment transactions
  - Auditing and compliance data
  - Management dashboard audit logs

- **MongoDB** - Document database for:
  - Product catalog (flexible schema for varying product attributes)
  - Inventory management
  - Product reviews and ratings
  - Analytics and event tracking
  - Chatbot conversation history

### **Testing**
- **Jest** - Unit and integration testing
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing with:
  - Cross-browser testing
  - Visual regression capabilities
  - Test fixtures and page object models

### **DevOps & CI/CD**
- **Docker Compose** - Local development environment
- **GitHub Actions** - CI/CD pipeline:
  - Automated testing
  - Build verification
  - Code quality checks
  - Deployment workflows

### **Development Tools**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates
- **TypeScript** - Static type checking

---

## 📁 Monorepo Structure

```
sawdust-and-scents/
├── apps/
│   ├── api/                    # NestJS Backend Application
│   │   ├── src/
│   │   │   ├── main.ts         # Application entry point
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── auth/           # Keycloak integration & guards
│   │   │   ├── products/       # Product management (MongoDB)
│   │   │   ├── orders/         # Order processing (PostgreSQL)
│   │   │   ├── cart/           # Shopping cart logic
│   │   │   ├── users/          # User management
│   │   │   ├── payments/       # Payment processing
│   │   │   ├── management/     # Management dashboard API (auth-protected)
│   │   │   ├── chatbot/        # Chatbot API endpoints
│   │   │   ├── database/       # DB connection modules
│   │   │   └── common/         # Shared utilities, DTOs, pipes
│   │   └── test/               # Backend test utilities
│   │
│   └── web/                    # React Frontend Application
│       ├── src/
│       │   ├── main.tsx        # React entry point
│       │   ├── App.tsx         # Root component
│       │   ├── features/       # Feature-based modules
│       │   │   ├── products/   # Product catalog features
│       │   │   ├── cart/       # Shopping cart features
│       │   │   ├── orders/     # Order management features
│       │   │   ├── auth/       # Authentication features
│       │   │   ├── management/ # Admin/Management dashboard (auth-protected)
│       │   │   └── chatbot/    # Chatbot feature for customer support
│       │   ├── components/     # Reusable UI components
│       │   ├── pages/          # Page-level components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API client services
│       │   ├── context/        # React context providers
│       │   └── theme/          # MUI theme configuration
│       └── e2e/                # Playwright E2E tests
│
├── libs/
│   ├── shared/                 # Shared code across apps
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/              # Utility functions
│   │   └── constants/          # Shared constants
│   └── ui/                     # Shared UI components
│
├── docker-compose.yml          # Local development services
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── nx.json                     # Nx workspace configuration
├── package.json                # Root package.json
└── README.md                   # This file
```

### Why This Structure?

- **Apps Directory**: Contains deployable applications (API and Web)
- **Libs Directory**: Contains reusable libraries and shared code
- **Feature-Based Organization**: Frontend organized by feature domains for scalability
- **Shared Code**: Common types and utilities extracted to `libs/shared` to avoid duplication
- **Test Co-location**: Tests live close to the code they test

---

## 🔄 How It All Fits Together

### Request Flow Example: Adding Product to Cart

```
1. User clicks "Add to Cart" on Product Page
   ↓
2. Frontend (React) → API Service Layer → POST /cart/items
   ↓
3. NestJS Controller → Cart Service
   ↓
4. Cart Service validates product exists (MongoDB query)
   ↓
5. Cart Service creates/updates cart item (PostgreSQL transaction)
   ↓
6. Cart Service returns updated cart to Controller
   ↓
7. Controller returns response to Frontend
   ↓
8. Frontend updates UI state and shows success message
```

### Authentication Flow

```
1. User visits protected route
   ↓
2. Keycloak JavaScript adapter checks for valid token
   ↓
3. If no token → Redirect to Keycloak login
   ↓
4. User authenticates with Keycloak
   ↓
5. Keycloak returns JWT tokens (access + refresh)
   ↓
6. Frontend stores tokens and attaches to API requests
   ↓
7. NestJS Keycloak Guard validates JWT on backend
   ↓
8. Request proceeds if token is valid and user has required roles
```

### Management Dashboard Access Flow

```
1. User navigates to /management route
   ↓
2. Frontend checks authentication status via Keycloak
   ↓
3. If not authenticated → Redirect to login
   ↓
4. If authenticated → Check user roles (admin, manager)
   ↓
5. If user has required role → Render management dashboard
   ↓
6. If user lacks required role → Show access denied message
   ↓
7. All API calls to /management/* endpoints require admin/manager role
   ↓
8. Backend Keycloak Guard validates role in JWT token
```

### Chatbot Flow

```
1. User opens chatbot widget on any page
   ↓
2. User types message/question
   ↓
3. Frontend sends message to POST /chatbot/message
   ↓
4. Backend processes message (rule-based or AI service)
   ↓
5. Backend may query product database for product info
   ↓
6. Backend returns response message
   ↓
7. Frontend displays response in chat interface
   ↓
8. Conversation history stored in MongoDB (optional)
```

### Database Strategy Rationale

**PostgreSQL** (Relational - Orders, Users, Payments):
- ACID compliance for financial transactions
- Complex relationships (orders → order_items → products)
- Referential integrity constraints
- Structured schema for compliance/auditing

**MongoDB** (Document - Products, Inventory, Analytics):
- Flexible schema for varied product attributes
- Efficient storage of product images/metadata
- Easy to scale for high-read scenarios
- Natural fit for analytics and event tracking

### State Management Approach

- **Server State**: Managed via React Query or similar for API data caching
- **Client State**: Local component state or Zustand for UI state (cart items, filters)
- **Auth State**: Keycloak adapter handles token management; React Context provides app-wide access

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Initial Setup

```bash
# Install dependencies
npm install

# Start development services (PostgreSQL, MongoDB, Keycloak)
docker-compose up -d

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run api:migration:run

# Start development servers
npm run dev  # Runs both frontend and backend in watch mode
```

### Available Commands

```bash
# Development
npm run dev              # Start all apps in development mode
npm run api:dev          # Start only backend
npm run web:dev          # Start only frontend

# Building
npm run build            # Build all apps
npm run api:build        # Build backend
npm run web:build        # Build frontend

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Generate test coverage reports

# Linting & Formatting
npm run lint             # Lint all code
npm run format           # Format all code
npm run format:check     # Check formatting

# Database
npm run api:migration:generate  # Generate TypeORM migration
npm run api:migration:run       # Run migrations
npm run api:migration:revert    # Revert last migration
```

---

## 🧪 Testing Strategy

### Unit Tests
- **Backend**: Jest tests for services, utilities, and business logic
- **Frontend**: React Testing Library for component testing

### Integration Tests
- **Backend**: Controller tests with in-memory test databases
- **API**: End-to-end API tests using test fixtures

### E2E Tests
- **Playwright**: Critical user journeys:
  - User registration and login
  - Product browsing and search
  - Adding items to cart
  - Checkout process
  - Order viewing
  - Management dashboard access (role-based)
  - Chatbot interactions

### Test Coverage Goals
- Unit tests: >80% coverage
- Integration tests: Critical paths covered
- E2E tests: All primary user flows

---

## 🔐 Security Considerations

- **Authentication**: Keycloak handles all authentication; no password storage
- **Authorization**: Role-based access control (RBAC) with Keycloak roles
- **API Security**: JWT token validation on all protected endpoints
- **Management Access**: Strict role-based access (admin/manager) for management dashboard
- **Input Validation**: DTO validation using class-validator
- **SQL Injection**: Prevented via ORM parameterized queries
- **XSS Prevention**: React's built-in XSS protection + sanitization
- **Chatbot Security**: Input sanitization and rate limiting on chatbot endpoints
- **CORS**: Configured to allow only trusted origins
- **Rate Limiting**: Implemented on authentication and chatbot endpoints

---

## 📊 Key Technical Decisions

### Why Nx?
- **Dependency Management**: Understands relationships between projects
- **Caching**: Intelligently caches build/test results for speed
- **Code Generation**: Generates boilerplate for consistency
- **Developer Experience**: Unified commands across all projects

### Why Dual Database?
- **Right Tool for Right Job**: PostgreSQL for transactional integrity, MongoDB for flexibility
- **Scalability**: Can scale databases independently based on load
- **Real-World Pattern**: Mirrors how enterprise systems handle polyglot persistence

### Why Keycloak?
- **Enterprise Standard**: Widely used in enterprise environments
- **OAuth/SSO**: Demonstrates understanding of modern auth patterns
- **Extensibility**: Can integrate with LDAP, SAML, social providers
- **Portfolio Value**: Shows knowledge beyond simple JWT implementations

### Why Playwright?
- **Modern E2E Testing**: Faster and more reliable than Selenium
- **Multi-Browser**: Tests across Chromium, Firefox, WebKit
- **Developer Experience**: Great debugging tools and TypeScript support
- **CI/CD Ready**: Designed for automated testing pipelines

---

## 🎓 What This Project Demonstrates

### Technical Skills
- ✅ Full-stack TypeScript development
- ✅ Monorepo architecture and tooling
- ✅ RESTful API design and documentation
- ✅ Database design and ORM usage
- ✅ Authentication and authorization patterns
- ✅ Testing strategies (unit, integration, E2E)
- ✅ CI/CD pipeline configuration
- ✅ Docker containerization
- ✅ Code quality and linting setup

### Software Engineering Practices
- ✅ Modular, maintainable code organization
- ✅ Separation of concerns and single responsibility
- ✅ Type safety and error handling
- ✅ API design and documentation
- ✅ Database migration strategies
- ✅ Environment configuration management
- ✅ Security best practices

### DevOps & Infrastructure
- ✅ Containerized development environment
- ✅ Automated CI/CD pipelines
- ✅ Database management and migrations
- ✅ Environment variable management

---

## 📝 Development Philosophy

This project emphasizes:
- **Code Quality**: Linting, formatting, and type safety
- **Testability**: Code structured for easy testing
- **Maintainability**: Clear structure and documentation
- **Scalability**: Architecture that can grow with business needs
- **Best Practices**: Following industry standards and patterns

---

## 🤝 Contributing

While this is a portfolio project, contributions and feedback are welcome. Please ensure:
- Code follows existing patterns and style
- Tests are added/updated for new features
- Documentation is updated as needed
- Commits follow conventional commit format

---

## 📄 License

This project is a portfolio demonstration. See license file for details.

---

## 📞 Contact

For questions about this implementation or technical discussions, please reach out through the repository.
