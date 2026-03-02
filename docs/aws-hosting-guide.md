# AWS Hosting Guide — Sawdust & Scents

## Overview

This guide walks through hosting the complete Sawdust & Scents platform on AWS with **two isolated environments**: `test` (staging) and `production`. Every service is containerised, infrastructure is defined as code, and deployments are automated through GitHub Actions.

---

## Tech Stack Recap

| Layer | Technology |
|---|---|
| Frontend | React + Vite (static SPA) |
| Backend API | NestJS (Node.js) |
| Authentication | Keycloak |
| Database | PostgreSQL (for Keycloak + future app data) |
| Monorepo | Nx |
| CI/CD | GitHub Actions |

---

## AWS Service Map

| What | AWS Service | Why |
|---|---|---|
| Frontend (static SPA) | S3 + CloudFront | Globally distributed, cheap, no server needed |
| Backend API (NestJS) | ECS Fargate | Serverless containers — no EC2 to manage |
| Keycloak | ECS Fargate | Same reason; pairs naturally with RDS |
| Database (PostgreSQL) | RDS PostgreSQL | Managed, automated backups, Multi-AZ for prod |
| Container images | ECR (Elastic Container Registry) | Private registry, integrates directly with ECS |
| Load balancing | Application Load Balancer (ALB) | Routes HTTP/S traffic to API and Keycloak |
| DNS | Route 53 | Manages `sawdustandscents.com` + subdomains |
| SSL certificates | ACM (Certificate Manager) | Free, auto-renewing TLS |
| Secrets | AWS Secrets Manager | DB passwords, Keycloak client secrets, API keys |
| Logs & monitoring | CloudWatch | Container logs, alarms, dashboards |
| Infrastructure as code | AWS CDK (TypeScript) | Matches your existing TS codebase |

---

## Environment Strategy

Two completely isolated environments, each with their own AWS resources:

```
test.sawdustandscents.com       → TEST environment  (safe to break — your staging area)
sawdustandscents.com            → PRODUCTION environment  (live customer traffic)

test-api.sawdustandscents.com   → TEST API  (NestJS backend for test env)
api.sawdustandscents.com        → PRODUCTION API  (NestJS backend for live env)

test-auth.sawdustandscents.com  → TEST Keycloak  (auth server for test env)
auth.sawdustandscents.com       → PRODUCTION Keycloak  (auth server for live env)
```

> **Recommendation**: Use a single AWS account with separate VPCs and resource name prefixes (`sdas-test-*` vs `sdas-prod-*`). Alternatively use two separate AWS accounts for stronger isolation — the CDK stack supports both patterns.

---

## Prerequisites

### 1. Install required tools

```bash
# Install the AWS CLI via winget (Windows package manager)
# This gives you the `aws` command to interact with AWS from the terminal
winget install Amazon.AWSCLI

# Install the AWS CDK globally — this is the TypeScript infrastructure-as-code tool
# CDK compiles your TS stacks into CloudFormation templates and deploys them
npm install -g aws-cdk

# Docker Desktop is needed to build and test container images locally
# Download from https://www.docker.com/products/docker-desktop

# Verify all three tools installed correctly — each should print a version number
aws --version      # e.g. aws-cli/2.x.x
cdk --version      # e.g. 2.x.x
docker --version   # e.g. Docker version 24.x.x
```

### 2. Configure AWS CLI

```bash
# Interactive wizard — sets up your local AWS credentials file (~/.aws/credentials)
# These credentials are used by all aws CLI commands and CDK deployments
aws configure
# AWS Access Key ID: <your key>       ← found in IAM → your user → Security credentials → Create access key
# AWS Secret Access Key: <your secret> ← shown once — copy it immediately
# Default region: us-east-1           ← the AWS region all resources will be created in by default
# Default output format: json         ← makes CLI responses easier to parse and read
```

### 3. Register your domain in Route 53

If your domain is not yet in Route 53:
1. Go to **Route 53 → Registered Domains → Register domain**
2. Search for `sawdustandscents.com` and purchase it
3. Route 53 will automatically create a Hosted Zone

If you already own the domain elsewhere (e.g. GoDaddy):
1. Create a **Hosted Zone** in Route 53 for your domain
2. Copy the 4 NS records Route 53 gives you
3. Paste them into your registrar's nameserver settings
   - This tells the internet "AWS Route 53 is now the authority for this domain"
4. Allow up to 48 hours for DNS propagation
   - During this window, some users may still resolve to the old nameservers

---

## Step 1 — Dockerise the Applications

Both the API and Keycloak need Docker images before they can run on ECS.

### 1a. NestJS API — `apps/api/Dockerfile`

```dockerfile
# ── Build stage ────────────────────────────────────────────────────────────────
# Use Node 20 on Alpine Linux — Alpine is a minimal ~5MB image, reduces final size
# AS builder names this stage so the runtime stage can copy from it
FROM node:20-alpine AS builder

# Set the working directory inside the container — all subsequent commands run here
WORKDIR /app

# Copy only package files first (before copying source code)
# Docker caches each layer — copying package files separately means npm ci only
# re-runs when dependencies change, not on every code change (faster builds)
COPY package*.json ./

# Install all dependencies (including devDependencies needed to build)
# npm ci is stricter than npm install — uses exact versions from package-lock.json
RUN npm ci

# Copy the entire monorepo source into the container
COPY . .

# Run the Nx production build for the API
# --configuration=production enables optimisations like tree-shaking and minification
RUN npx nx build api --configuration=production

# ── Runtime stage ──────────────────────────────────────────────────────────────
# Start a fresh minimal image for the final container — does NOT include the builder layer
# This is called a multi-stage build: the build tools stay in the builder, not the shipped image
FROM node:20-alpine AS runner

# Set working directory in the runtime container
WORKDIR /app

# Tell NestJS and Node.js this is a production environment
# Disables dev-only features, enables performance optimisations
ENV NODE_ENV=production

# Copy only the compiled output from the builder stage — not the source code
COPY --from=builder /app/dist/apps/api ./dist

# Copy node_modules from the builder — avoids re-running npm ci in the runtime stage
COPY --from=builder /app/node_modules ./node_modules

# Tell Docker (and ECS) that this container listens on port 3000
# This does not actually open the port — it's documentation for the orchestrator
EXPOSE 3000

# The command that runs when the container starts
# Runs the compiled NestJS entry point directly with Node
CMD ["node", "dist/main.js"]
```

### 1b. Test the image locally

```bash
# Build the Docker image from the Dockerfile in apps/api/
# -f specifies which Dockerfile to use (needed because we're running from the monorepo root)
# -t names and tags the image as sdas-api (latest tag is implied)
# The trailing . is the build context — Docker sends this entire directory to the Docker daemon
docker build -f apps/api/Dockerfile -t sdas-api .

# Run the image locally to verify it starts correctly
# -p 3000:3000 maps port 3000 on your machine to port 3000 inside the container
# --env-file .env.local injects your local environment variables into the container
# sdas-api is the image name to run - this overrides local host for POSTGRES
docker run -p 3000:3000 --env-file .env.local -e POSTGRES_HOST=host.docker.internal sdas-api
```

### 1c. Keycloak

Keycloak runs from the official image, but you need to bake your local realm configuration into a custom image so ECS starts with the correct clients, roles, and redirect URIs already configured. Do these three sub-steps now, before touching AWS.

#### 1c-i. Export the realm from your running local Keycloak

Make sure your local Keycloak container is running (it is started by your `docker-compose` or equivalent setup).

```bash
# List running containers so you can find the Keycloak container name
# Look for a container whose image is quay.io/keycloak/keycloak or similar
docker ps

# Export only the sdas-realm (not the master realm) into a temp directory inside the container
# Replace <keycloak-container-name> with the actual name shown by `docker ps`
# kc.sh export is the Keycloak CLI tool; --realm limits the export to a single realm
docker exec -it <keycloak-container-name> \
  /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm sdas-realm

# Create the destination folder in your monorepo if it doesn't exist yet
mkdir -p infrastructure/keycloak

# Copy the exported JSON from inside the container to your local machine
# This file will be committed to the repo so CI/CD and ECS can use it
docker cp <keycloak-container-name>:/tmp/export/sdas-realm.json \
  ./infrastructure/keycloak/sdas-realm.json
```

After running this you should have `infrastructure/keycloak/sdas-realm.json` on disk.  
Commit it to Git — it is not a secret (it contains no passwords, only configuration).

#### 1c-ii. Create a custom Keycloak Dockerfile

Create the file `infrastructure/keycloak/Dockerfile`:

```dockerfile
# Start from the official Keycloak image
# Using a pinned version (e.g. 24.0) is recommended in production so a Keycloak
# upgrade never happens silently. Use `latest` here while developing.
FROM quay.io/keycloak/keycloak:latest

# Copy the exported realm JSON into the directory Keycloak scans on first boot
# KC_IMPORT (set in the ECS task definition) points Keycloak at this file
# Any realm in /opt/keycloak/data/import/ is imported automatically if the DB is empty
COPY sdas-realm.json /opt/keycloak/data/import/sdas-realm.json

# Tell Keycloak to run in production mode (optimised, no dev console exposed)
# The actual start command will be passed by the ECS task definition
```

#### 1c-iii. Build and smoke-test the image locally

```bash
# Build the custom Keycloak image from the infrastructure/keycloak directory
# The context is infrastructure/keycloak so COPY can find sdas-realm.json
docker build -t sdas-keycloak ./infrastructure/keycloak

# Run it locally to verify it starts and imports the realm
# KC_DB=dev-file uses an embedded H2 database — fine for a smoke test, not for production
# KC_BOOTSTRAP_ADMIN_USERNAME / KC_BOOTSTRAP_ADMIN_PASSWORD set the initial admin account
# -p 8080:8080 exposes the Keycloak UI on http://localhost:8080
docker run --rm \
  -e KC_DB=dev-file \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -p 8080:8080 \
  sdas-keycloak \
  start-dev

# Open http://localhost:8080/admin in your browser
# Log in with admin / admin
# Navigate to the realm selector — you should see sdas-realm listed
# If it appears, the image is correct and ready to push to ECR in Step 2
```

> **Note:** The production ECS task definition will replace `KC_DB=dev-file` with real PostgreSQL credentials from Secrets Manager. This local test just confirms the image builds and the realm imports correctly.

---

## Step 2 — Create ECR Repositories

ECR stores your Docker images. One repository per service, shared across environments (environment is encoded in the image tag).

```bash
# Create the ECR repository for the NestJS API image
# --repository-name is the logical name — sdas/api uses a namespace prefix for organisation
# --region must match the region you'll deploy ECS to
aws ecr create-repository --repository-name sdas/api --region us-east-1

# Create the ECR repository for the Keycloak image
aws ecr create-repository --repository-name sdas/keycloak --region us-east-1

# After running these, note the repositoryUri values printed in the output
# You'll paste these into the CDK stack in Step 3
# Format: <account-id>.dkr.ecr.us-east-1.amazonaws.com/sdas/api
```

### Push your first image

```bash
# Get a temporary Docker login token from ECR and pipe it directly into docker login
# aws ecr get-login-password generates a short-lived token (12 hours)
# --username AWS is required by ECR (always literally "AWS", not your username)
# --password-stdin reads the token from the pipe rather than exposing it in the command
# Replace <account-id> with your 12-digit AWS account ID
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build the API image locally (same as step 1b)
docker build -f apps/api/Dockerfile -t sdas-api .

# Tag the local image with the full ECR URI so Docker knows where to push it
# sdas-api:latest is the local name, the long URI is the ECR destination
docker tag sdas-api:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/sdas/api:latest

# Push the tagged image up to ECR
# ECS will pull from this URI when starting your containers
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sdas/api:latest
```

---

## Step 3 — Infrastructure as Code with AWS CDK

Create a CDK project at the monorepo root to define all infrastructure.

### 3a. Initialise the CDK project

```bash
# Create the infrastructure directory and enter it
mkdir infrastructure && cd infrastructure

# Scaffold a new CDK app in TypeScript
# This creates bin/, lib/, package.json, tsconfig.json, cdk.json
cdk init app --language typescript

# Install CDK construct libraries for each AWS service we'll use
# Each package corresponds to one AWS service
npm install @aws-cdk/aws-s3 @aws-cdk/aws-cloudfront \         # Frontend hosting
             @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns \      # Container orchestration
             @aws-cdk/aws-rds @aws-cdk/aws-secretsmanager \    # Database + secrets
             @aws-cdk/aws-route53 @aws-cdk/aws-certificatemanager  # DNS + SSL
```

### 3b. Stack structure

```
infrastructure/
  lib/
    sdas-frontend-stack.ts    ← S3 bucket + CloudFront distribution for the React app
    sdas-backend-stack.ts     ← ECS Fargate services for API + Keycloak, plus the ALB
    sdas-database-stack.ts    ← RDS PostgreSQL instance
    sdas-dns-stack.ts         ← Route 53 hosted zone + ACM SSL certificates
  bin/
    sdas.ts                   ← Entry point — instantiates all stacks, passes env name between them
```

### 3c. Environment-aware entry point (`bin/sdas.ts`)

```typescript
// Import the core CDK library — everything in CDK extends cdk.Stack or cdk.App
import * as cdk from 'aws-cdk-lib';

// Import our four stack definitions — each file defines one layer of infrastructure
import { SdasFrontendStack } from '../lib/sdas-frontend-stack';
import { SdasBackendStack }  from '../lib/sdas-backend-stack';
import { SdasDatabaseStack } from '../lib/sdas-database-stack';
import { SdasDnsStack }      from '../lib/sdas-dns-stack';

// Create the root CDK App — this is the container that holds all stacks
const app = new cdk.App();

// Read the target environment from CDK context flags
// Usage: cdk deploy -c env=test  OR  cdk deploy -c env=prod
// Defaults to 'test' if no env flag is provided — prevents accidental prod deploys
const envName = app.node.tryGetContext('env') ?? 'test';

// Resolve the AWS account ID and region from environment variables
// CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION are set automatically by `cdk bootstrap`
const awsEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,  // your 12-digit AWS account ID
    region:  process.env.CDK_DEFAULT_REGION ?? 'us-east-1',  // fallback to us-east-1
};

// Instantiate stacks — order matters: backend needs the DB, frontend needs the DNS zone
// Each stack name includes envName so test and prod stacks never collide (e.g. Sdas-test-Database)
const dbStack  = new SdasDatabaseStack(app, `Sdas-${envName}-Database`, { env: awsEnv, envName });
const dnsStack = new SdasDnsStack(app,      `Sdas-${envName}-Dns`,      { env: awsEnv, envName });

// beStack receives dbStack.cluster so it knows the DB endpoint without hardcoding
const beStack  = new SdasBackendStack(app,  `Sdas-${envName}-Backend`,  { env: awsEnv, envName, db: dbStack.cluster });

// Frontend receives dnsStack.hostedZone to create Route 53 A records and validate the SSL cert
new SdasFrontendStack(app,                  `Sdas-${envName}-Frontend`, { env: awsEnv, envName, hostedZone: dnsStack.hostedZone });
```

Deploy to test:
```bash
# Deploys all four stacks to the test environment
# --all means deploy every stack defined in bin/sdas.ts
# -c env=test passes "test" as the envName context variable
cd infrastructure
cdk deploy --all -c env=test
```

Deploy to production:
```bash
# Same command but with env=prod — creates entirely separate AWS resources
cdk deploy --all -c env=prod
```

### 3d. Frontend stack (`lib/sdas-frontend-stack.ts`)

```typescript
// CDK construct libraries — one import per AWS service
import * as cdk  from 'aws-cdk-lib';              // core CDK types (Stack, Duration, etc.)
import * as s3   from 'aws-cdk-lib/aws-s3';        // S3 bucket for storing static files
import * as cf   from 'aws-cdk-lib/aws-cloudfront'; // CloudFront CDN distribution
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'; // connects CloudFront to S3
import * as r53  from 'aws-cdk-lib/aws-route53';   // DNS records
import * as acm  from 'aws-cdk-lib/aws-certificatemanager'; // SSL/TLS certificates

export class SdasFrontendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // Destructure the environment name and hosted zone passed from bin/sdas.ts
        const { envName, hostedZone } = props;

        // Set the domain based on environment
        // prod gets the apex domain; test gets the test subdomain
        const domainName = envName === 'prod'
            ? 'sawdustandscents.com'
            : 'test.sawdustandscents.com';

        // Create a private S3 bucket to store the built React app files
        // blockPublicAccess.BLOCK_ALL means only CloudFront can read it — not the public internet
        // removalPolicy.DESTROY means CDK will delete this bucket when you run `cdk destroy`
        const bucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `sdas-${envName}-frontend`,          // unique name across all of AWS
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // no direct public access
            removalPolicy: cdk.RemovalPolicy.DESTROY,          // clean up on stack deletion
        });

        // Request an SSL/TLS certificate from ACM (free, auto-renewing)
        // DnsValidatedCertificate automatically adds validation CNAME records to Route 53
        // IMPORTANT: CloudFront certificates MUST be in us-east-1 regardless of your main region
        const cert = new acm.DnsValidatedCertificate(this, 'Cert', {
            domainName,   // the domain this cert will secure
            hostedZone,   // Route 53 hosted zone used to validate ownership automatically
        });

        // Create the CloudFront distribution — the global CDN that serves the React app
        const distribution = new cf.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(bucket), // serve files from our private S3 bucket
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // force HTTPS
            },
            domainNames: [domainName],  // the custom domain (not the default *.cloudfront.net URL)
            certificate: cert,           // the ACM cert for HTTPS on the custom domain
            defaultRootObject: 'index.html', // serve index.html when the root URL is requested
            // SPA routing fix — React Router handles URLs like /about and /contact client-side
            // Without this, CloudFront returns a 404 for those paths since the files don't exist in S3
            errorResponses: [{
                httpStatus: 404,           // when S3 says the file doesn't exist
                responseHttpStatus: 200,   // tell the browser it's actually OK
                responsePagePath: '/index.html', // serve index.html so React Router takes over
            }],
        });

        // Create a Route 53 A record pointing the domain to the CloudFront distribution
        // An Alias record is AWS-specific — it's like a CNAME but works at the zone apex
        new r53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,          // the Route 53 hosted zone for sawdustandscents.com
            recordName: domainName,    // the specific subdomain or apex to point
            target: r53.RecordTarget.fromAlias(
                new targets.CloudFrontTarget(distribution) // route DNS to this CloudFront dist
            ),
        });

        // Output the CloudFront URL after deploy — useful for CI/CD to verify the deployment
        new cdk.CfnOutput(this, 'DistributionUrl', {
            value: distribution.distributionDomainName, // e.g. d1234abcd.cloudfront.net
        });

        // Output the S3 bucket name — CI/CD needs this to upload the built React app files
        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName, // e.g. sdas-test-frontend
        });
    }
}
```

### 3e. Database stack (`lib/sdas-database-stack.ts`)

```typescript
import * as cdk from 'aws-cdk-lib';      // core CDK types
import * as rds from 'aws-cdk-lib/aws-rds'; // RDS managed database service
import * as ec2 from 'aws-cdk-lib/aws-ec2'; // VPC and networking

export class SdasDatabaseStack extends cdk.Stack {
    // Expose the RDS instance publicly so the backend stack can reference its endpoint
    public readonly cluster: rds.DatabaseInstance;

    constructor(scope, id, props) {
        super(scope, id, props);

        // Destructure the environment name from props passed in bin/sdas.ts
        const { envName } = props;

        // Create a VPC (Virtual Private Cloud) — an isolated network for our resources
        // maxAzs: 2 spans two availability zones for redundancy (two data centres in the region)
        // The VPC contains public subnets (ALB), private subnets (ECS, RDS), and NAT Gateways
        const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

        // Create a managed PostgreSQL RDS instance
        // CDK stores the generated admin password in Secrets Manager automatically
        this.cluster = new rds.DatabaseInstance(this, 'Postgres', {
            instanceIdentifier: `sdas-${envName}-postgres`, // unique name in your AWS account
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,  // PostgreSQL version 16
            }),
            // Use a larger instance in prod for performance; micro is enough for test
            instanceType: envName === 'prod'
                ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)  // ~$35/mo
                : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // ~$15/mo
            vpc,              // place the database inside our VPC (not publicly accessible)
            multiAz: envName === 'prod',           // multi-AZ = automatic failover in prod only
            deletionProtection: envName === 'prod', // prevent accidental deletion in prod only
            databaseName: 'keycloak',               // initial database created on first boot
            // fromGeneratedSecret auto-generates a strong password and stores it in Secrets Manager
            // The username 'keycloak' becomes the DB master user
            credentials: rds.Credentials.fromGeneratedSecret('keycloak'),
        });
    }
}
```

### 3f. Backend stack — ECS Fargate for API + Keycloak

The backend stack uses the `ApplicationLoadBalancedFargateService` CDK pattern, which creates the ECS cluster, task definition, service, and ALB in one construct.

Key points to implement:

- **Keycloak service**: use `quay.io/keycloak/keycloak:latest`, pass DB credentials from Secrets Manager as environment variables, set `KC_DB=postgres`, `KC_HOSTNAME` to your auth subdomain
- **API service**: use your ECR image, pass `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_SECRET` from Secrets Manager
- **ALB listener rules**: route `/auth/*` to Keycloak, all other traffic to the API
- Set `desiredCount: 1` for test, `desiredCount: 2` for production (auto-scaling)

---

## Step 4 — Secrets Management

Never put secrets in environment variables baked into images. Store them in **AWS Secrets Manager** and reference them in ECS task definitions.

### Store secrets

```bash
# Create a secret for the Keycloak admin password in the test environment
# --name uses a path-style naming convention (sdas/env/name) for easy filtering
# openssl rand -base64 32 generates a cryptographically random 32-byte password
# The $(...) runs the openssl command and passes its output as the secret value
aws secretsmanager create-secret \
  --name "sdas/test/keycloak-admin-password" \
  --secret-string "$(openssl rand -base64 32)"

# Create a secret for the Keycloak client secret (used by the NestJS API to verify tokens)
# Replace 'your-client-secret-here' with the value from your local Keycloak admin console
# (Clients → sdas-api → Credentials → Client secret)
aws secretsmanager create-secret \
  --name "sdas/test/keycloak-client-secret" \
  --secret-string "your-client-secret-here"

# Repeat the above two commands for the production environment
# Just change the path prefix from sdas/test/ to sdas/prod/
```

### Reference in CDK task definition

```typescript
// Import Secrets Manager and ECS construct libraries
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';

// Look up the existing secret by name — does NOT create it, just references it
// The string matches the --name used in the aws secretsmanager create-secret command above
// envName is either 'test' or 'prod', so this resolves to sdas/test/keycloak-client-secret
const clientSecret = secretsmanager.Secret.fromSecretNameV2(
    this, 'KeycloakClientSecret', `sdas/${envName}/keycloak-client-secret`
);

// In your task definition:
// The `secrets` block injects Secrets Manager values as environment variables at container startup
// ECS fetches the secret value at runtime — it is NEVER baked into the image
taskDefinition.addContainer('api', {
    image: ecs.ContainerImage.fromEcrRepository(apiRepo, imageTag), // pull from ECR
    secrets: {
        // KEYCLOAK_CLIENT_SECRET env var inside the container = value from Secrets Manager
        KEYCLOAK_CLIENT_SECRET: ecs.Secret.fromSecretsManager(clientSecret),
    },
    // Non-sensitive config goes in environment (these are fine to be visible in task definition)
    environment: {
        KEYCLOAK_URL:   `https://auth.${domain}`,   // Keycloak server URL for token validation
        KEYCLOAK_REALM: 'sdas-realm',               // the Keycloak realm name
        NODE_ENV:       'production',               // tells NestJS to run in production mode
    },
});
```

---

## Step 5 — Build and Deploy the Frontend

The Vite build outputs static files to `dist/apps/web`. These get uploaded to S3 and CloudFront cache is invalidated.

### Build

```bash
# Run the Nx production build for the web app
# --configuration=production enables Vite's production mode: minification, tree-shaking, etc.
# Output goes to dist/apps/web/ (index.html + hashed JS/CSS bundles + public assets)
npx nx build web --configuration=production
```

This produces `dist/apps/web/` with `index.html`, JS bundles, and assets.

### Deploy to S3 + invalidate CloudFront

```bash
# Upload the built files to the S3 bucket
# aws s3 sync only uploads files that changed (compares checksums) — fast for incremental deploys
# dist/apps/web/ is the local source directory
# s3://sdas-test-frontend is the destination bucket
# --delete removes files from S3 that no longer exist locally (keeps the bucket in sync)
aws s3 sync dist/apps/web/ s3://sdas-test-frontend --delete

# Tell CloudFront to clear its cached copies of all files
# Without this, users may see the old version for up to 24 hours (the default TTL)
# --distribution-id is the CloudFront distribution ID from the CDK output (e.g. E1234ABCDEF)
# --paths "/*" invalidates every cached file in the distribution
aws cloudfront create-invalidation \
  --distribution-id <your-distribution-id> \
  --paths "/*"
```

### Environment variables at build time

Vite embeds env vars at build time via the `define` block in `vite.config.mts`. For each environment, pass the correct values:

```bash
# Test build — sets environment variables that Vite bakes into the JS bundle at build time
# These values point the frontend at the test environment's Keycloak and API servers
KEYCLOAK_URL=https://auth.test.sawdustandscents.com \   # Keycloak server for test env
KEYCLOAK_REALM=sdas-realm \                             # Keycloak realm name (same for both envs)
KEYCLOAK_WEB_CLIENT_ID=sdas-web \                       # public Keycloak client ID for the browser
API_BASE_URL=https://test-api.sawdustandscents.com \    # NestJS API base URL for test env
npx nx build web --configuration=production

# Production build — same command, different URLs pointing at the live environment
KEYCLOAK_URL=https://auth.sawdustandscents.com \        # live Keycloak server
...
npx nx build web --configuration=production
```

---

## Step 6 — CI/CD with GitHub Actions

Two workflows: one for test (triggers on push to `main`), one for production (triggers on a tagged release).

### Required GitHub Secrets

Add these in **GitHub → Settings → Secrets and Variables → Actions**:

```
AWS_ACCESS_KEY_ID          ← IAM access key used by GitHub Actions to authenticate with AWS
AWS_SECRET_ACCESS_KEY      ← paired secret key
AWS_REGION                 ← e.g. us-east-1 — must match where your infrastructure is deployed
AWS_ACCOUNT_ID             ← your 12-digit AWS account number

# Test environment — values come from CDK outputs after deploying the test stack
TEST_ECR_API_REPO                ← full ECR URI e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/sdas/api
TEST_CLOUDFRONT_DISTRIBUTION_ID  ← e.g. E1ABCDEF123456
TEST_S3_BUCKET                   ← sdas-test-frontend
TEST_KEYCLOAK_URL                ← https://auth.test.sawdustandscents.com
TEST_API_BASE_URL                ← https://test-api.sawdustandscents.com

# Production environment — same pattern, prod values
PROD_ECR_API_REPO
PROD_CLOUDFRONT_DISTRIBUTION_ID
PROD_S3_BUCKET                   ← sdas-prod-frontend
PROD_KEYCLOAK_URL                ← https://auth.sawdustandscents.com
PROD_API_BASE_URL                ← https://api.sawdustandscents.com
```

### `.github/workflows/deploy-test.yml`

```yaml
# Workflow name — shown in the GitHub Actions UI
name: Deploy to Test

# Trigger: run this workflow on every push to the main branch
on:
  push:
    branches: [main]

# Shared environment variables available to all jobs in this workflow
env:
  AWS_REGION: ${{ secrets.AWS_REGION }}  # read from GitHub Secrets — avoids hardcoding the region

jobs:
  # Job 1: run all tests before any deployment happens
  # If tests fail, the deploy-api and deploy-frontend jobs are skipped
  test:
    runs-on: ubuntu-latest  # use a fresh Ubuntu VM provided by GitHub
    steps:
      - uses: actions/checkout@v4  # check out the repo code onto the runner

      # Set up Node.js 20 — matches the version used in our Dockerfile and local dev
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm  # cache node_modules between runs to speed up the job

      - run: npm ci  # install exact dependencies from package-lock.json

      # Run all Nx unit tests across every project in the monorepo
      # --ci flag disables interactive output and exits with a non-zero code on failure
      - name: Run unit tests
        run: npx nx run-many --target=test --all --ci

  # Job 2: build the Docker image and deploy the API to ECS
  deploy-api:
    needs: test  # only runs if the test job passed — gates deployment on green tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      # Configure AWS credentials from GitHub Secrets so all subsequent aws CLI commands work
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      # Log Docker into ECR — required before docker push will work
      # Outputs a registry URL used in subsequent steps
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # Build the API Docker image and push it to ECR with two tags:
      # 1. The git commit SHA — provides an immutable, traceable tag for every build
      # 2. 'latest' — convenient reference for the most recent test image
      - name: Build and push API image
        run: |
          IMAGE_TAG=${{ github.sha }}           # unique tag = the git commit hash
          REPO=${{ secrets.TEST_ECR_API_REPO }} # ECR repository URI from GitHub Secrets

          docker build -f apps/api/Dockerfile -t $REPO:$IMAGE_TAG .  # build with commit SHA tag
          docker push $REPO:$IMAGE_TAG                                 # push SHA-tagged image

          docker tag $REPO:$IMAGE_TAG $REPO:latest  # also tag as latest for test env convenience
          docker push $REPO:latest                   # push the latest tag

      # Tell ECS to replace running containers with the new image
      # --force-new-deployment pulls the new 'latest' image even if the task definition hasn't changed
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster sdas-test \       # the ECS cluster name (created by CDK)
            --service sdas-test-api \   # the ECS service name (created by CDK)
            --force-new-deployment      # triggers a rolling replacement of running tasks

  # Job 3: build the React app and deploy to S3 + CloudFront
  deploy-frontend:
    needs: test  # also gates on tests passing
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      # Build the React app with environment variables pointing at the test environment
      # These are baked into the JS bundle by Vite at build time
      - name: Build frontend
        env:
          KEYCLOAK_URL: ${{ secrets.TEST_KEYCLOAK_URL }}    # test Keycloak server
          KEYCLOAK_REALM: sdas-realm                         # realm name (same in both envs)
          KEYCLOAK_WEB_CLIENT_ID: sdas-web                   # public client ID
          API_BASE_URL: ${{ secrets.TEST_API_BASE_URL }}     # test API URL
        run: npx nx build web --configuration=production     # Vite production build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      # Upload the built files to the test S3 bucket
      # --delete ensures files removed from the build don't linger in S3
      - name: Upload to S3
        run: |
          aws s3 sync dist/apps/web/ s3://${{ secrets.TEST_S3_BUCKET }} --delete

      # Bust the CloudFront cache so users immediately see the new version
      # Without this, CloudFront serves cached files for up to 24 hours
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.TEST_CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"  # invalidate all cached files
```

### `.github/workflows/deploy-prod.yml`

```yaml
# Production deploys are intentionally separate from test deploys
# They trigger on version tags, not on every push — gives you manual control over releases
name: Deploy to Production

# Trigger: only run when a version tag is pushed (e.g. v1.0.0, v2.3.1)
# This means you control exactly when production gets updated
on:
  push:
    tags:
      - 'v*'   # matches v1.0.0, v1.2.3, v2.0.0-beta, etc.

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      # Same steps as deploy-test.yml but referencing PROD_* secrets
      # and targeting cluster: sdas-prod, service: sdas-prod-api
      # (Copy the deploy-test jobs and swap TEST_ prefixes to PROD_)

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      # Same steps as deploy-test.yml but using PROD_* secrets
      # and production Keycloak/API URLs from PROD_KEYCLOAK_URL and PROD_API_BASE_URL
```

**To trigger a production deployment:**
```bash
# Create a version tag locally — follows semantic versioning (major.minor.patch)
git tag v1.0.0

# Push the tag to GitHub — this is what triggers the deploy-prod.yml workflow
git push origin v1.0.0
```

---

## Step 7 — Keycloak Realm Export / Import

You need to migrate your local `sdas-realm` configuration to the hosted Keycloak instance.

### Export from local Docker

```bash
# Run the Keycloak export command inside your running local Keycloak container
# docker exec -it runs a command interactively inside a running container
# Replace <keycloak-container-name> with the name from `docker ps`
# kc.sh export is the Keycloak CLI tool for exporting realm configuration
# --dir /tmp/export is the destination directory inside the container
# --realm sdas-realm specifies which realm to export (just yours, not the master realm)
docker exec -it <keycloak-container-name> \
  /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm sdas-realm

# Copy the exported JSON file out of the container onto your local machine
# docker cp works like the regular cp command but crosses the container boundary
# The destination ./infrastructure/keycloak/ keeps it in the repo for CI/CD to use
docker cp <keycloak-container-name>:/tmp/export/sdas-realm.json \
  ./infrastructure/keycloak/sdas-realm.json
```

### Import into AWS Keycloak on first boot

Pass the export file as an environment variable in the ECS task definition:

```typescript
// Environment variables for the Keycloak ECS container definition
// These configure Keycloak to connect to RDS and import the realm on first boot
environment: {
    KC_DB:               'postgres',                               // use PostgreSQL as the Keycloak database
    KC_DB_URL:           `jdbc:postgresql://${dbEndpoint}/keycloak`, // JDBC connection string to RDS
    KC_HOSTNAME:         `auth.${domain}`,                         // public hostname Keycloak uses for redirects
    KEYCLOAK_ADMIN:      'admin',                                  // admin console username
    KC_IMPORT:           '/opt/keycloak/data/import/sdas-realm.json', // path to realm file to import on startup
},
```

Mount the realm JSON via an S3-backed EFS volume or bake it into a custom Keycloak image:

```dockerfile
# Start from the official Keycloak image
FROM quay.io/keycloak/keycloak:latest

# Copy the exported realm config into the Keycloak import directory
# Keycloak automatically imports JSON files from this path if KC_IMPORT points to them
COPY sdas-realm.json /opt/keycloak/data/import/sdas-realm.json
```

After the first successful boot, remove `KC_IMPORT` to prevent re-importing on every restart.

---

## Step 8 — DNS and SSL

### Request certificates in ACM

```bash
# Request a wildcard-style certificate for the test environment
# --domain-name is the primary domain on the certificate
# --subject-alternative-names adds additional domains covered by the same certificate
# --validation-method DNS uses CNAME records for ownership verification (automated by CDK)
# --region us-east-1 is MANDATORY for CloudFront — certificates used by CloudFront MUST be in us-east-1
aws acm request-certificate \
  --domain-name "test.sawdustandscents.com" \
  --subject-alternative-names "test-api.sawdustandscents.com" "test-auth.sawdustandscents.com" \
  --validation-method DNS \
  --region us-east-1

# Request a certificate for the production environment
# www. is included as an alternative name so both www and apex domain work with HTTPS
aws acm request-certificate \
  --domain-name "sawdustandscents.com" \
  --subject-alternative-names "www.sawdustandscents.com" "api.sawdustandscents.com" "auth.sawdustandscents.com" \
  --validation-method DNS \
  --region us-east-1
```

ACM will give you CNAME records to add to Route 53 for validation. The CDK `DnsValidatedCertificate` construct does this automatically.

---

## Step 9 — Monitoring and Alarms

### CloudWatch log groups

ECS Fargate automatically ships container logs to CloudWatch. Log groups are created by CDK with this naming convention:

```
/ecs/sdas-test-api         ← stdout/stderr from your NestJS API container in the test environment
/ecs/sdas-test-keycloak    ← Keycloak container logs for test
/ecs/sdas-prod-api         ← NestJS API logs for production
/ecs/sdas-prod-keycloak    ← Keycloak logs for production
```

### Recommended alarms to create

```typescript
// Alarm: fires if the API returns 5 or more 5xx errors within a 2-minute window
// 5xx errors indicate server-side failures (unhandled exceptions, DB timeouts, etc.)
new cloudwatch.Alarm(this, 'Api5xxAlarm', {
    metric: alb.metricHttpCodeTarget(
        elbv2.HttpCodeTarget.TARGET_5XX_COUNT,  // count of 5xx responses from ECS tasks
        { period: cdk.Duration.minutes(1) }     // evaluated every 1 minute
    ),
    threshold: 5,            // trigger if more than 5 errors in one period
    evaluationPeriods: 2,    // must exceed threshold for 2 consecutive periods before alarming
    alarmDescription: 'API returning 5xx errors',  // shown in CloudWatch and SNS notifications
});

// Alarm: fires if the API container is using more than 80% CPU for 3 consecutive minutes
// High CPU sustained over time may indicate a traffic spike or an infinite loop
new cloudwatch.Alarm(this, 'ApiCpuAlarm', {
    metric: fargateService.metricCpuUtilization(), // built-in ECS Fargate CPU metric
    threshold: 80,           // 80% CPU utilisation
    evaluationPeriods: 3,    // must stay above 80% for 3 consecutive 1-minute periods
});
```

---

## Deployment Checklist

### Before first deploy

- [ ] Domain registered and nameservers pointing to Route 53
- [ ] ACM certificates requested and validated (CNAME records added to Route 53)
- [ ] ECR repositories created (`sdas/api` and `sdas/keycloak`)
- [ ] Secrets stored in AWS Secrets Manager (`sdas/test/*` and `sdas/prod/*`)
- [ ] `sdas-realm.json` exported from local Keycloak and saved to `infrastructure/keycloak/`
- [ ] GitHub Secrets configured in repo settings
- [ ] CDK bootstrapped: `cdk bootstrap aws://<account>/<region>`
  - This creates a staging S3 bucket and IAM roles CDK needs to deploy stacks

### Test environment deploy

```bash
cd infrastructure
# Deploy all four stacks to the test environment
# CDK compares the desired state (your TypeScript) against the current AWS state
# and applies only the differences — safe to run repeatedly
cdk deploy --all -c env=test
```

### Production environment deploy

```bash
cd infrastructure
# Same command as test but targets production resources
# Consider running cdk diff -c env=prod first to preview changes before applying
cdk deploy --all -c env=prod
```

### Post-deploy verification

- [ ] Frontend loads at `test.sawdustandscents.com` / `sawdustandscents.com`
- [ ] API health check responds: `GET https://[test-]api.sawdustandscents.com/health`
- [ ] Keycloak admin console accessible: `https://[test-]auth.sawdustandscents.com`
- [ ] Login flow works end-to-end through the UI
- [ ] Social login (Google, GitHub) redirects back correctly
- [ ] CloudWatch logs showing no errors

---

## Estimated Monthly Cost (us-east-1)

| Service | Test | Production |
|---|---|---|
| S3 + CloudFront | ~$2 | ~$10–30 (traffic dependent) |
| ECS Fargate (API) | ~$15 | ~$30 (2 tasks) |
| ECS Fargate (Keycloak) | ~$15 | ~$30 (2 tasks) |
| RDS t3.micro/small | ~$15 | ~$35 |
| ALB | ~$18 | ~$18 |
| Route 53 | ~$1 | ~$1 |
| Secrets Manager | ~$1 | ~$1 |
| **Total estimate** | **~$67/mo** | **~$125–145/mo** |

> Cost optimisation tip: Shut down the test environment outside business hours using scheduled ECS scaling rules (`desired count = 0` at night) to cut test costs by ~70%.
