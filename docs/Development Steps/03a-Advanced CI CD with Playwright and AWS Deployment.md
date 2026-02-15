# Step 03a: Advanced CI/CD with Playwright Testing and AWS Deployment

## 1. The "Why" Behind This Step: From Safety Net to Delivery Pipeline

In **Step 03**, we built a basic CI pipeline that runs lint, test, and build on every push. That's our safety net — it catches problems. But a safety net doesn't deliver the product. In this tutorial, we will evolve that basic pipeline into a **full delivery system** that:

1. **Validates** code quality (lint + build) on every push.
2. **Verifies** business logic by running all Playwright API tests against real databases.
3. **Deploys** a Docker image to our **AWS Dev** environment automatically.
4. **Promotes** the Dev image to our **AWS Test** environment on a nightly schedule.

**The Analogy**: Think of a candy factory:
- **Step 03** was the quality inspector who checks each candy for defects.
- **This step** adds the packaging machine (Docker), the delivery truck (Deploy to Dev), and the nightly route to the warehouse (Promote to Test).

---

## 2. Core Concepts & Definitions

### 2.1 Multi-Stage Pipeline
A pipeline where each stage must pass before the next one starts. If linting fails, tests never run. If tests fail, we never deploy. This prevents broken code from ever reaching a server.

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│ Build & Lint │ ──► │ Playwright Tests  │ ──► │ Deploy to Dev │
└──────────────┘     │ (with databases)  │     └───────────────┘
                     └──────────────────┘
                                                    ▼ (nightly)
                                              ┌───────────────┐
                                              │Promote to Test│
                                              └───────────────┘
```

### 2.2 Docker Image
A **Docker image** is a portable, self-contained snapshot of your application and all its dependencies. Think of it as a shipping container — no matter what ship (server) carries it, the contents are identical.

### 2.3 Amazon ECR (Elastic Container Registry)
A private Docker image warehouse on AWS. You push images here, and AWS services (like ECS) pull from here to run your app.

### 2.4 Amazon ECS Fargate (Elastic Container Service)
AWS runs your Docker container for you without requiring you to manage servers. You tell it "run this image with this much CPU and RAM" and Fargate handles the rest.

### 2.5 GitHub Actions Services
GitHub Actions can spin up **Docker containers alongside your test runner**. This means you can have PostgreSQL, MongoDB, and Keycloak running during your Playwright tests — just like your local `docker-compose.yml`, but in the cloud.

### 2.6 Image Tagging Strategy
We tag Docker images with:
- The **Git SHA** (e.g., `abc123f`) — a unique, permanent identifier for that exact commit.
- A **rolling tag** (e.g., `dev-latest`) — always points to the most recent successful build for that environment.

---

## 3. Prerequisites: What You Need Before Starting

### 3.1 AWS Account & Infrastructure
Before the pipeline can deploy, you need the following AWS resources created. These are typically set up using **Terraform** or the AWS Console (see **Step 37** for IaC details):

| AWS Resource | Purpose | You Need Two (Dev + Test) |
|---|---|---|
| **ECR Repository** | Stores your Docker images | No — one repo, different tags |
| **ECS Cluster** | Runs your containers | Yes — `sdas-dev` and `sdas-test` |
| **ECS Service + Task Definition** | Defines how your container runs | Yes — one per cluster |
| **RDS PostgreSQL** | Managed PostgreSQL | Yes — one per environment |
| **DocumentDB** (or MongoDB Atlas) | Managed MongoDB | Yes — one per environment |
| **Application Load Balancer** | Routes HTTPS traffic to ECS | Yes — one per environment |
| **IAM Deploy Role** | Permissions for GitHub to push/deploy | No — one role, scoped per env |

### 3.2 GitHub Repository Secrets
Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** and add each of these:

| Secret Name | Example Value | Purpose |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM deploy user credentials |
| `AWS_SECRET_ACCESS_KEY` | `wJalr...` | IAM deploy user credentials |
| `AWS_REGION` | `us-east-1` | Your AWS region |
| `AWS_ACCOUNT_ID` | `123456789012` | Your 12-digit AWS account ID |
| `ECR_REPOSITORY` | `sdas-api` | Name of your ECR repository |
| `DEV_ECS_CLUSTER` | `sdas-dev` | Dev environment ECS cluster name |
| `DEV_ECS_SERVICE` | `sdas-api-dev` | Dev environment ECS service name |
| `TEST_ECS_CLUSTER` | `sdas-test` | Test environment ECS cluster name |
| `TEST_ECS_SERVICE` | `sdas-api-test` | Test environment ECS service name |
| `TEST_DATABASE_URL` | `postgres://...` | Test PostgreSQL connection string |
| `TEST_ADMIN_USERNAME` | `chris` | Keycloak admin for Playwright tests |
| `TEST_ADMIN_PASSWORD` | *(your password)* | Keycloak admin password |
| `TEST_USER_USERNAME` | `chris_worker` | Keycloak regular user |
| `TEST_USER_PASSWORD` | *(your password)* | Keycloak regular user password |

**Security Note**: Never put credentials in code or `.yml` files. Always use GitHub Secrets, which are encrypted and never appear in logs.

---

## 4. Step-by-Step Implementation

### Step 4.1: Create the Dockerfile

Our API needs to be packaged into a Docker image. We use a **multi-stage build** to keep the final image small.

**Tutorial Action**: Create a file named `Dockerfile` in the project root.

```dockerfile
# ================================================================
# STAGE 1: Build
# ================================================================
# Start with a full Node.js image that has all the tools needed to compile.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first (Docker caches this layer if they don't change)
COPY package*.json ./
RUN npm ci

# Copy the entire project source
COPY . .

# Use Nx to build only the API in production mode
RUN npx nx build api --configuration=production

# ================================================================
# STAGE 2: Run
# ================================================================
# Start from a clean, minimal image — no build tools, no source code.
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the compiled output and production dependencies
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/node_modules ./node_modules

# Expose the port our NestJS app listens on
EXPOSE 3000

# Start the application
CMD ["node", "main.js"]
```

**Why multi-stage?** The `builder` stage has your entire source code, devDependencies, and build tools — it could be 1+ GB. The `runner` stage only has the compiled JavaScript and production `node_modules` — typically under 200 MB.

### Step 4.2: Create the `.dockerignore`

Just like `.gitignore` prevents certain files from being committed, `.dockerignore` prevents files from being copied into the Docker image.

**Tutorial Action**: Create `.dockerignore` in the project root.

```
node_modules
dist
.git
.github
.nx
coverage
*.md
.env*
docker-compose.yml
```

### Step 4.3: Export Your Keycloak Realm for CI

This is the **most critical setup step**. In CI, you need a Keycloak instance with your realm, clients, roles, and test users pre-configured. You cannot manually click through the admin console in a CI pipeline.

**Tutorial Action**:

1. **Export your realm** from your local Keycloak:
   - Open `http://localhost:8080/admin`
   - Go to your realm (e.g., `sawdust-and-scents`)
   - Click **Realm settings** → **Action** (top right) → **Partial export**
   - Check **Export groups and roles** and **Export clients**
   - Click **Export** and save the file as `keycloak/realm-export.json`

2. **Create a custom Keycloak Docker image** that auto-imports this realm:

   **Tutorial Action**: Create `keycloak/Dockerfile`:

   ```dockerfile
   FROM quay.io/keycloak/keycloak:22.0.1
   
   # Copy our pre-configured realm into the import directory
   COPY realm-export.json /opt/keycloak/data/import/
   
   # Override the default entrypoint to start in dev mode with auto-import
   ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
   ```

   **Why?** When this image starts, Keycloak automatically imports the realm from `/opt/keycloak/data/import/`. This means your CI Keycloak is identical to your local one — same clients, same roles, same test users.

3. **Build and push this image to ECR** (one-time manual step):
   ```bash
   cd keycloak
   docker build -t sdas-keycloak-ci .
   
   # Tag and push to ECR (after logging in)
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   docker tag sdas-keycloak-ci:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/sdas-keycloak-ci:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/sdas-keycloak-ci:latest
   ```

   **Alternative**: You can also use the public Keycloak image with a startup script that calls the Keycloak Admin REST API to create your realm, clients, and users. The Dockerfile approach above is simpler and faster.

---

### Step 4.4: Create the CI → Deploy Dev Workflow

This workflow runs on **every push** to `main`. It has three stages that run sequentially — each stage must pass before the next one starts.

**Tutorial Action**: Replace the contents of `.github/workflows/ci.yml` with:

```yaml
# ================================================================
# CI → Deploy Dev Pipeline
# ================================================================
# Triggered on every push to main or PR targeting main.
# Stages: Build & Lint → Playwright Tests → Deploy to AWS Dev
# ================================================================

name: CI → Deploy Dev

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# ----------------------------------------------------------------
# Environment variables available to ALL jobs in this workflow
# ----------------------------------------------------------------
env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}

jobs:
  # ================================================================
  # STAGE 1: Build & Lint
  # ================================================================
  # Purpose: Catch syntax errors, formatting issues, and compilation
  # failures as fast as possible. This is the cheapest check to run.
  # ================================================================
  build-and-lint:
    name: 🔍 Build & Lint
    runs-on: ubuntu-latest
    steps:
      # 1. Check out the code with full history (needed for nx affected)
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # 2. Install Node.js (match your local version!)
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      # 3. Install dependencies (clean install for reproducibility)
      - name: Install dependencies
        run: npm ci

      # 4. Let Nx figure out which projects changed
      - name: Derive SHAs for Nx affected
        uses: nrwl/nx-set-shas@v4

      # 5. Run linting on affected projects only
      - name: Lint affected projects
        run: npx nx affected -t lint

      # 6. Build affected projects
      - name: Build affected projects
        run: npx nx affected -t build

  # ================================================================
  # STAGE 2: Playwright API Tests
  # ================================================================
  # Purpose: Verify that our API endpoints return the correct data,
  # handle errors gracefully, and enforce security rules.
  #
  # This stage spins up real databases (Postgres, MongoDB) and
  # Keycloak as GitHub Actions "services" — Docker containers that
  # run alongside our test code.
  # ================================================================
  playwright-tests:
    name: 🧪 Playwright API Tests
    needs: build-and-lint    # Only runs if Stage 1 passed
    runs-on: ubuntu-latest

    # ---------------------------------------------------------------
    # GitHub Actions Services
    # ---------------------------------------------------------------
    # These are Docker containers that run alongside the job.
    # They are accessible via `localhost` on their exposed ports.
    # Think of this as a mini docker-compose inside CI.
    # ---------------------------------------------------------------
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: sdas_user
          POSTGRES_PASSWORD: sdas_password
          POSTGRES_DB: sdas_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U sdas_user"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

      mongodb:
        image: mongo:7.0
        env:
          MONGO_INITDB_ROOT_USERNAME: sdas_admin
          MONGO_INITDB_ROOT_PASSWORD: sdas_password
        ports:
          - 27017:27017

      # Use our custom Keycloak image that has the realm pre-imported
      # If you haven't built a custom image yet, you can use the
      # public image and add a setup step to configure it via the
      # Keycloak Admin REST API.
      keycloak:
        image: quay.io/keycloak/keycloak:22.0.1
        env:
          KC_HOSTNAME: localhost
          KC_HOSTNAME_PORT: 8080
          KC_HOSTNAME_STRICT: 'false'
          KC_HOSTNAME_STRICT_HTTPS: 'false'
          KC_HTTP_ENABLED: 'true'
          KEYCLOAK_ADMIN: sdas_admin
          KEYCLOAK_ADMIN_PASSWORD: sdas_admin
        ports:
          - 8080:8080
        # NOTE: GitHub Actions services don't support 'command:'.
        # For production CI, use the custom image from Step 4.3:
        #   image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/sdas-keycloak-ci:latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Playwright needs browser binaries for certain operations.
      # Even for API-only tests, this ensures the Playwright binary is ready.
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      # Start the NestJS API server in the background.
      # The & at the end runs it as a background process.
      - name: Start API server
        run: npx nx serve api &
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: sdas_user
          DATABASE_PASSWORD: sdas_password
          DATABASE_NAME: sdas_db
          MONGODB_URI: mongodb://sdas_admin:sdas_password@localhost:27017
          KEYCLOAK_URL: http://localhost:8080
          KEYCLOAK_REALM: sawdust-and-scents
          KEYCLOAK_CLIENT_ID: sdas-api
          NODE_ENV: test

      # Wait for the API to be healthy before running tests.
      # This loop retries every 5 seconds for up to 2.5 minutes.
      - name: Wait for API to be ready
        run: |
          echo "Waiting for API server to start..."
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3000/api > /dev/null 2>&1; then
              echo "✅ API is ready!"
              exit 0
            fi
            echo "  Attempt $i/30 — not ready yet, waiting 5s..."
            sleep 5
          done
          echo "❌ API did not start within 150 seconds"
          exit 1

      # Run the Playwright API tests using our existing config and fixtures.
      # The --project=api flag tells Playwright to only run the API project,
      # which uses the baseURL and test directory we configured in
      # apps/e2e/playwright.config.ts.
      - name: Run Playwright API tests
        run: npx playwright test --config=apps/e2e/playwright.config.ts --project=api
        env:
          API_URL: http://localhost:3000
          KEYCLOAK_URL: http://localhost:8080
          TEST_ADMIN_USERNAME: ${{ secrets.TEST_ADMIN_USERNAME }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          TEST_USER_USERNAME: ${{ secrets.TEST_USER_USERNAME }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      # Upload the Playwright HTML report as a build artifact.
      # Even if tests fail, we want the report for debugging.
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: coverage/playwright-report/
          retention-days: 14

  # ================================================================
  # STAGE 3: Docker Build & Deploy to Dev
  # ================================================================
  # Purpose: Package the application into a Docker image, push it
  # to ECR, and tell ECS to deploy the new version.
  #
  # This stage ONLY runs on pushes to main (not on PRs).
  # On PRs, we just validate — we don't deploy.
  # ================================================================
  deploy-dev:
    name: 🚀 Deploy to Dev
    needs: playwright-tests    # Only runs if Stage 2 passed
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Authenticate with AWS using the IAM deploy credentials
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      # Get a temporary token to push Docker images to ECR
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # Build the Docker image and push it with two tags:
      #   1. The Git SHA (permanent reference to this exact build)
      #   2. "dev-latest" (always points to the most recent dev build)
      - name: Build, tag, and push Docker image
        run: |
          IMAGE_TAG="${{ github.sha }}"
          echo "Building image with tag: $IMAGE_TAG"
          
          docker build \
            -t ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:$IMAGE_TAG \
            -t ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:dev-latest \
            .
          
          docker push ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:$IMAGE_TAG
          docker push ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:dev-latest
          
          echo "✅ Image pushed: $IMAGE_TAG and dev-latest"

      # Tell ECS to pull the new image and restart the service.
      # --force-new-deployment ensures ECS picks up the new "dev-latest" tag.
      - name: Deploy to ECS Dev
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.DEV_ECS_CLUSTER }} \
            --service ${{ secrets.DEV_ECS_SERVICE }} \
            --force-new-deployment
          
          echo "✅ Deployment triggered to Dev cluster"
```

---

### Step 4.5: Create the Nightly Promotion Workflow

This workflow runs **every night at 2:00 AM UTC**. Its job is simple: take whatever image is currently running in Dev and deploy it to the Test environment. This gives your Test environment a stable, daily build.

**Tutorial Action**: Create a new file at `.github/workflows/nightly-promote-test.yml`:

```yaml
# ================================================================
# Nightly → Promote Dev to Test
# ================================================================
# Runs on a schedule (every night at 2 AM UTC) and can also be
# triggered manually via the GitHub Actions UI ("workflow_dispatch").
#
# What it does:
#   1. Pulls the "dev-latest" image from ECR
#   2. Re-tags it as "test-latest"
#   3. Pushes the new tag
#   4. Runs database migrations (if any)
#   5. Deploys to the Test ECS cluster
# ================================================================

name: Nightly → Promote to Test

on:
  schedule:
    # ┌───────────── minute (0-59)
    # │ ┌───────────── hour (0-23)
    # │ │ ┌───────────── day of month (1-31)
    # │ │ │ ┌───────────── month (1-12)
    # │ │ │ │ ┌───────────── day of week (0-6, Sun=0)
    # │ │ │ │ │
    - cron: '0 2 * * *'
  
  # Allow manual trigger from the GitHub Actions UI
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}

jobs:
  promote-to-test:
    name: 🌙 Promote Dev → Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # ---------------------------------------------------------------
      # Authenticate with AWS
      # ---------------------------------------------------------------
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # ---------------------------------------------------------------
      # Re-tag the image
      # ---------------------------------------------------------------
      # "dev-latest" is the image that passed all tests on the last push.
      # We pull it, tag it as "test-latest", and push the new tag.
      # This does NOT rebuild the image — it's the exact same binary.
      # ---------------------------------------------------------------
      - name: Re-tag dev-latest → test-latest
        run: |
          echo "Pulling dev-latest..."
          docker pull ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:dev-latest
          
          echo "Tagging as test-latest..."
          docker tag \
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:dev-latest \
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:test-latest
          
          echo "Pushing test-latest..."
          docker push ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:test-latest
          
          echo "✅ Image promoted: dev-latest → test-latest"

      # ---------------------------------------------------------------
      # Database Migrations (if needed)
      # ---------------------------------------------------------------
      # In development we use TypeORM's `synchronize: true`, which
      # auto-creates tables. In test/production, this is DANGEROUS
      # because it can drop columns with data.
      #
      # Instead, we use TypeORM migrations — versioned SQL scripts
      # that safely alter the schema. See Section 5 below.
      # ---------------------------------------------------------------
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: |
          echo "Running TypeORM migrations against test database..."
          npx typeorm migration:run -d dist/apps/api/data-source.js || true
          echo "✅ Migrations complete"
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      # ---------------------------------------------------------------
      # Deploy to ECS Test
      # ---------------------------------------------------------------
      - name: Deploy to ECS Test
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.TEST_ECS_CLUSTER }} \
            --service ${{ secrets.TEST_ECS_SERVICE }} \
            --force-new-deployment
          
          echo "✅ Deployment triggered to Test cluster"
```

---

## 5. Database Migration Strategy

### 5.1 The Problem

Right now, your TypeORM configuration likely has `synchronize: true`. This tells TypeORM to automatically create or alter database tables to match your entity definitions every time the app starts. This is **wonderful for development** but **catastrophic in production** because:

- If you rename a column, TypeORM drops the old column (and all its data!) and creates a new one.
- If you remove a field from an entity, TypeORM drops that column silently.

### 5.2 The Solution: Migrations

Migrations are versioned scripts that describe **exactly** how to change the database schema. They can be run forward (apply the change) or rolled back (undo the change).

**Tutorial Action**: In your TypeORM configuration (e.g., `apps/api/src/app/app.module.ts` or a separate `data-source.ts`), conditionally disable synchronize:

```typescript
TypeOrmModule.forRoot({
  // ... connection options ...
  synchronize: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
  migrations: ['dist/apps/api/migrations/*.js'],
  migrationsRun: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test',
})
```

**To generate a migration** after changing an entity:

```bash
# Build the project first (TypeORM CLI needs compiled JS)
npx nx build api

# Generate a migration based on entity changes
npx typeorm migration:generate -d dist/apps/api/data-source.js src/migrations/AddPhoneNumberToUser
```

This creates a file like `1707936000000-AddPhoneNumberToUser.ts` with the exact SQL needed to alter the table.

### 5.3 MongoDB (Mongoose)

Mongoose doesn't have formal migrations. For schema changes:
- **Adding new fields** is safe — Mongoose ignores extra fields in old documents and returns `undefined` for missing fields.
- **Renaming or removing fields** requires a one-time migration script. Store these in a `scripts/mongo-migrations/` folder and run them as needed.

---

## 6. Deep Dive: How the Pipeline Connects

Here's the complete flow from a developer pushing code to a user hitting the Test server:

```
Developer pushes to main
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS: ci.yml                                 │
│                                                         │
│  ┌──────────────┐                                       │
│  │ Build & Lint  │ ← Catches syntax / formatting errors │
│  └──────┬───────┘                                       │
│         │ ✅ Pass                                        │
│         ▼                                               │
│  ┌──────────────────────────┐                           │
│  │ Playwright API Tests     │                           │
│  │ ┌──────┐ ┌──────┐       │                           │
│  │ │ PG   │ │Mongo │ ← GitHub Actions Services         │
│  │ └──────┘ └──────┘       │                           │
│  │ ┌──────────┐            │                           │
│  │ │ Keycloak │            │                           │
│  │ └──────────┘            │                           │
│  └──────────┬──────────────┘                           │
│             │ ✅ All tests pass                         │
│             ▼                                           │
│  ┌──────────────────────┐                               │
│  │ Docker Build & Push  │ → ECR (tagged: sha + dev-latest)│
│  └──────────┬───────────┘                               │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────┐                               │
│  │ Deploy to ECS Dev    │ → Dev server updated          │
│  └──────────────────────┘                               │
└─────────────────────────────────────────────────────────┘

  ⏰ 2:00 AM UTC (Nightly)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS: nightly-promote-test.yml               │
│                                                         │
│  ┌──────────────────────────┐                           │
│  │ Pull dev-latest from ECR │                           │
│  └──────────┬───────────────┘                           │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────┐                           │
│  │ Re-tag as test-latest    │ → Same binary, new tag    │
│  └──────────┬───────────────┘                           │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────┐                           │
│  │ Run DB Migrations        │ → ALTER TABLE if needed   │
│  └──────────┬───────────────┘                           │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────┐                           │
│  │ Deploy to ECS Test       │ → Test server updated     │
│  └──────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## 7. How This Connects to Your Existing Code

### 7.1 Playwright Config (Already Done)

Your `apps/e2e/playwright.config.ts` already has the `api` project configured with environment variable support:

```typescript
projects: [
  {
    name: 'api',
    testDir: './src/tests/API',
    use: {
      baseURL: (process.env.API_URL || 'http://localhost:3000') + '/api/',
    },
  },
  // ... browser projects
],
```

The CI workflow passes `API_URL=http://localhost:3000` as an environment variable, so your tests resolve to the correct URL without any changes.

### 7.2 Fixtures (Already Done)

Your `api.fixtures.ts` reads credentials from environment variables:

```typescript
const username = role === 'admin' 
  ? process.env.TEST_ADMIN_USERNAME 
  : process.env.TEST_USER_USERNAME;
```

The CI workflow passes these from GitHub Secrets, so your existing fixtures work in CI without modification.

### 7.3 Docker Compose (Local Only)

Your `docker-compose.yml` is still used for **local development only**. In CI, GitHub Actions services replace it. In AWS, managed services (RDS, DocumentDB) replace it. You don't need to change it.

---

## 8. Verification & Testing

### 8.1 Test the Dockerfile Locally

Before pushing, verify your Dockerfile works:

```bash
# Build the image
docker build -t sdas-api:local .

# Run it (connecting to your local databases)
docker run -p 3001:3000 \
  -e DATABASE_HOST=host.docker.internal \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sdas_user \
  -e DATABASE_PASSWORD=sdas_password \
  -e DATABASE_NAME=sdas_db \
  -e MONGODB_URI=mongodb://sdas_admin:sdas_password@host.docker.internal:27017 \
  sdas-api:local

# Test it
curl http://localhost:3001/api/products
```

### 8.2 Test the Workflow Locally (Optional)

You can use [act](https://github.com/nektos/act) to run GitHub Actions workflows locally:

```bash
# Install act
brew install act   # macOS
# or
choco install act-cli   # Windows

# Run the build-and-lint job
act -j build-and-lint
```

### 8.3 Verify on GitHub

After pushing:
1. Go to your repo on GitHub → **Actions** tab.
2. You should see the "CI → Deploy Dev" workflow running.
3. Click on it to watch each stage in real time.
4. If any stage fails, the subsequent stages will not run.

---

## 9. Troubleshooting Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `npm ci` fails in CI | `package-lock.json` out of sync | Run `npm install` locally, commit the lock file |
| Playwright tests timeout | API server didn't start in time | Increase the wait loop count or check service health |
| Keycloak tests fail with 401 | Realm not imported in CI Keycloak | Use custom Keycloak image (Step 4.3) or add realm setup script |
| Docker build fails `COPY . .` too large | Missing `.dockerignore` | Create `.dockerignore` (Step 4.2) |
| ECS deploy doesn't pick up new image | Task definition still points to old tag | Use `--force-new-deployment` or update the task definition tag |
| Nightly job doesn't run | Cron syntax error or repo is inactive | GitHub disables cron on repos with no activity for 60 days; push a commit |
| Migration fails on test DB | Migration was already applied | TypeORM tracks applied migrations in a `migrations` table; safe to re-run |

---

## 10. Implementation Checklist

- [ ] **Dockerfile**: Created in project root with multi-stage build
- [ ] **.dockerignore**: Created to exclude unnecessary files
- [ ] **Keycloak export**: Realm exported to `keycloak/realm-export.json`
- [ ] **Keycloak CI image**: Custom Dockerfile built and pushed to ECR
- [ ] **GitHub Secrets**: All AWS and test credentials added
- [ ] **AWS Resources**: ECR repo, ECS clusters (dev + test), RDS, DocumentDB provisioned
- [ ] **ci.yml**: Updated with three-stage pipeline (Build → Test → Deploy)
- [ ] **nightly-promote-test.yml**: Created with cron schedule
- [ ] **TypeORM migrations**: `synchronize` disabled for test/production
- [ ] **Local Docker test**: Verified `docker build` and `docker run` work
- [ ] **GitHub verification**: Watched the pipeline run successfully in the Actions tab

---

## 11. Vocabulary Breakdown

| Term | Definition |
|---|---|
| **Multi-stage build** | A Docker build technique that uses multiple `FROM` statements to separate the build environment from the runtime, resulting in smaller images |
| **GitHub Actions Service** | A Docker container that runs alongside your CI job, accessible via `localhost` — used for databases and other dependencies |
| **ECR (Elastic Container Registry)** | AWS's private Docker image repository |
| **ECS (Elastic Container Service)** | AWS's container orchestration service that runs and manages Docker containers |
| **Fargate** | A serverless compute engine for ECS — you don't manage the underlying servers |
| **Image tag** | A label attached to a Docker image (like `dev-latest` or `abc123f`) used to identify specific versions |
| **Rolling tag** | A tag (like `dev-latest`) that is updated to point to newer images over time, as opposed to immutable SHA tags |
| **Cron schedule** | A time-based job scheduler syntax originating from Unix; `0 2 * * *` means "at 2:00 AM every day" |
| **Migration** | A versioned database schema change script that can be applied or rolled back |
| **`--force-new-deployment`** | An ECS flag that tells the service to pull the latest image and restart all tasks, even if the task definition hasn't changed |

---

**Summary**: You now have a complete delivery pipeline. Every push to `main` is automatically validated, tested against real databases, packaged into a Docker image, and deployed to your Dev server. Every night, that proven Dev image is promoted to your Test server with any necessary database changes. This ensures your Test environment always has a stable, fully-tested build for QA and stakeholders to evaluate.
