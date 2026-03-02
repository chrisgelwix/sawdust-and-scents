# ================================================================
# STAGE 1: Build
# ================================================================
# Use Node 20 on Alpine Linux - Alpine is a minimal ~5MB image, reduces final size
# AS builder names this stage so the runtime stage can copy from it
FROM node:20-alpine AS builder

#Install Python -- needed for some npm install scripting
RUN apk add --no-cache python3 py3-pip build-base && \
    ln -sf python3 /usr/bin/python

# Set the working directory inside the container
WORKDIR /app
# Copy packages files first for optimal layer caching
# If package.json hasn't changed don't re-pull node_modules
COPY package.json package-lock.json ./

# Install all dependencies including dev dependencies needed to build
# npm ci uses exact versions from package-lock.json (stricter than npm install)
# --legacy-peer-deps: required because nest-keycloak-connect@1.10.1 declares a peer dep
#   on @nestjs/common <11, but this project uses @nestjs/common@11. The flag tells npm
#   to use npm v6-style peer dep resolution (install anyway) instead of erroring out.
#   This matches the --legacy-peer-deps flag used when the package was originally installed locally.
# --mount=type=cache caches the npm download cache between builds so repeated builds
#   don't re-download packages from the internet (faster CI builds)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --legacy-peer-deps
#Copy the entire monorepo source into the container
COPY . .
#Run the Nx production build for the API
#--configuration=production enables optimisations like tree-shaking and minification
RUN npx nx build api --configuration=production


# ================================================================
# STAGE 2: Run
# ================================================================
# Start a fresh minimal image for the final container - does NOT include the builder layer
#This is called a multi-stage build: the build tools stay in the builder, not the shipped image
FROM node:20-alpine AS runner
# Set working directory in the runtime container
WORKDIR /app
# Tell NestJS and Node.js this is a production environment
# Disables dev-only features, enables performance optimisations
ENV NODE_ENV=production
# Copy only the compiled output from the builder stage - not the source code
COPY --from=builder /app/dist/apps/api ./dist
# Copy node_modules from the builder - avoids re-running npm ci in the runtime stage
COPY --from=builder /app/node_modules ./node_modules
# Tell Docker (and ECS) that this container listens on port 3000
# This does not actually open the port - it's documentation for the orchestrator
EXPOSE 3000
# The command that runs when the container starts
# Runs the compiled NestJS entry point directly with Node
CMD ["node", "dist/main.js"]