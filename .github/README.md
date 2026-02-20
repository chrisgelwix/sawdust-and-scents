# Sawdust & Scents - Technical Documentation

## 📖 Project Overview

**Sawdust & Scents** is a modern, enterprise-grade e-commerce platform built to demonstrate high-standard full-stack development. It facilitates the sale of handcrafted woodworking items and artisanal candles, featuring a robust microservices-inspired architecture managed within a monorepo.

This repository serves as a reference implementation for:
- Scalable **Monorepo** architecture using **Nx**.
- **Polyglot Persistence** strategies (SQL + NoSQL).
- Enterprise **Authentication** patterns (OAuth2/OIDC).
- **Type-Safe** full-stack development.

---

## 🛠 Technology Stack

### Core Architecture
- **Monorepo Tooling**: [Nx](https://nx.dev)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Package Manager**: NPM

### Backend (`apps/api`)
- **Framework**: [NestJS](https://nestjs.com/)
- **Databases**:
  - **PostgreSQL** (via TypeORM): Used for transactional data (Orders, Payments, Users).
  - **MongoDB** (via Mongoose): Used for flexible catalog data (Products, Reviews) and analytics.
- **Authentication**: [Keycloak](https://www.keycloak.org/) (Identity & Access Management).
- **Documentation**: Swagger / OpenAPI.

### Frontend (`apps/web`)
- **Framework**: [React 19](https://react.dev/)
- **Build System**: [Vite](https://vitejs.dev/)
- **Styling**: CSS Modules with Shared UI Components.
- **State Management**: React Hooks & Context.

### Quality Assurance (`apps/e2e`)
- **E2E Testing**: [Playwright](https://playwright.dev/)
- **Unit/Integration**: [Jest](https://jestjs.io/) / [Vitest](https://vitest.dev/)
- **Code Quality**: ESLint, Prettier, Husky.

### Infrastructure
- **Containerization**: Docker & Docker Compose.
- **CI/CD**: GitHub Actions.

---

## 🚀 Methodologies

This project adheres to industry-standard software engineering methodologies:

### 1. Modular Monolith Architecture
We utilize **Nx** to separate concerns while keeping the codebase unified.
- **Apps**: Deployable units (`api`, `web`).
- **Libs**: Shareable logic (`shared/types`, `shared/ui`).
- **Benefits**: Code reuse, atomic commits, and simplified dependency management.

### 2. Domain-Driven Design (DDD) Principles
Modules are organized by **business domain** rather than technical layers.
- Example: `modules/orders` contains the controller, service, entity, and DTOs specific to Orders.

### 3. End-to-End Type Safety
Shared TypeScript interfaces (`libs/shared/types`) ensure that the Frontend and Backend speak the same language. API response types are defined once and consumed by both applications, eliminating synchronization bugs.

### 4. CI/CD & Automation
The `.github/workflows` directory defines our automated pipelines:
- **Nx Affected**: Only builds and tests projects that have changed.
- **Linting & Formatting**: Enforced on every commit via Husky and CI.
- **Testing**: Automated Unit and E2E tests run on Pull Requests.

---

## 📂 Repository Structure

A high-level view of the file organization:

```
sawdust-and-scents/
├── .github/                 # GitHub Actions, Templates, and this documentation
├── apps/                    # Deployable Applications
│   ├── api/                 # NestJS Backend
│   │   └── src/
│   │       ├── modules/     # Feature Modules (Auth, Cart, Orders, etc.)
│   │       └── main.ts      # Application Entry Point
│   ├── web/                 # React Frontend
│   │   └── src/
│   │       ├── features/    # Frontend Feature Modules
│   │       └── main.tsx     # React Entry Point
│   └── e2e/                 # Playwright End-to-End Test Suite
├── libs/                    # Shared Libraries
│   └── shared/
│       ├── types/           # Shared TypeScript Interfaces
│       └── ui/              # Reusable React UI Components
├── tools/                   # Workspace Scripts
├── docker-compose.yml       # Local Dev Infrastructure (Postgres, Mongo, Keycloak)
├── nx.json                  # Nx Workspace Configuration
└── package.json             # Root Dependencies
```

---

## 🔄 GitHub Workflows

This directory (`.github`) manages the continuous integration lifecycle.

### `workflows/ci.yml`
Triggered on **Pull Requests** and **Push to Main**.
1.  **Setup**: Installs Node.js and dependencies.
2.  **Lint**: Checks code style and potential errors.
3.  **Test**: Runs unit tests for affected projects.
4.  **Build**: Verifies that the applications build successfully.

To run these checks locally before pushing:
```bash
npx nx affected -t lint,test,build
```
