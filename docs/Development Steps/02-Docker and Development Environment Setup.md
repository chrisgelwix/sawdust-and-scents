# Step 02: Docker and Development Environment Setup

## 1. The "Why" Behind This Step: Environment Parity

A common frustration in development is the "It works on my machine" syndrome. One developer might have PostgreSQL 14, another has PostgreSQL 15, and the production server has PostgreSQL 16. These tiny differences lead to "Ghost Bugs" that are impossible to find.

**The Solution**: We use **Docker**.
- **The Analogy**: Imagine a "Ship in a Bottle." 
    - You build the ship exactly how you want it inside the bottle. 
    - You can give that bottle to anyone in the world, and they will see the **exact same ship**, regardless of what kind of table they put the bottle on.
    - Docker is the "Bottle" (the Container) for our software.

---

## 2. Core Concepts & Definitions

#### 2.1 Containerization

A **Docker Container** is a lightweight, standalone package that includes everything needed to run a piece of software: the code, the runtime (like Node.js), and the system libraries. 

#### 2.2 Docker Compose (The Conductor)

If Docker is the container, **Docker Compose** is the "Conductor" of the orchestra. It allows us to manage multiple containers at once. Instead of starting Postgres, MongoDB, and Keycloak with three different commands, we use one single file (`docker-compose.yml`) to start the entire "orchestra."

#### 2.3 Polyglot Persistence

In this project, we use **Two different types of databases**. 
- **PostgreSQL (SQL)**: A relational database. Best for "Must-be-Perfect" data like Orders.
- **MongoDB (NoSQL)**: A document database. Best for "Flexible" data like a Product Catalog.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Environment File (`.env.local`)

Before we start Docker, we need a place to store our "Secrets" (usernames and passwords). 
Create a file named `.env.local` in your root directory:

```text
# PostgreSQL Configuration
POSTGRES_USER=sdas_user
POSTGRES_PASSWORD=sdas_password
POSTGRES_DB=sdas_db
POSTGRES_PORT=5432

# MongoDB Configuration
MONGO_USER=sdas_admin
MONGO_PASSWORD=sdas_password
MONGO_DB=sdas_catalog
MONGO_PORT=27017

# Keycloak Configuration
KEYCLOAK_ADMIN=sdas_admin
KEYCLOAK_ADMIN_PASSWORD=sdas_admin
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sdas-realm
KEYCLOAK_CLIENT_ID=sdas-api
```

### Step 3.2: Create the Infrastructure Blueprint (`docker-compose.yml`)

Create a file named `docker-compose.yml` in your project root. 

```yaml
version: '3.8'

services:
  # 1. PostgreSQL - Our "Record of Truth" (SQL)
  postgres:
    image: postgres:15-alpine
    container_name: sdas-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - '${POSTGRES_PORT}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # 2. MongoDB - Our Flexible Catalog (NoSQL)
  mongodb:
    image: mongo:7.0
    container_name: sdas-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - '${MONGO_PORT}:27017'
    volumes:
      - mongodb_data:/data/db

  # 3. Keycloak - Our Security Guard (Auth)
  keycloak:
    image: quay.io/keycloak/keycloak:22.0.1
    container_name: sdas-keycloak
    restart: always
    environment:
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HTTP_ENABLED: 'true'
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    ports:
      - '8080:8080'
    command: start-dev
    depends_on:
      - postgres

volumes:
  postgres_data:
  mongodb_data:
```

### Step 3.3: Launch the Infrastructure

Run the following command in your terminal:

```bash
docker-compose up -d
```

---

## 4. Deep Dive: Docker Keyword Breakdown

#### 4.1 `image: postgres:15-alpine`
- **The Logic**: `alpine` is a tiny version of Linux. Using alpine images makes your downloads faster and more secure because there is less "extra" software for bugs to hide in.

#### 4.2 `ports: ["5432:5432"]`
- **The Logic**: This "punches a hole" in the container's firewall. It says: "If someone talks to port 5432 on my real computer, send that message to port 5432 inside the Postgres container."

#### 4.3 `volumes:`
- **The Logic**: Containers are like "Snapshots"—when you delete them, they reset to zero. By "Mapping" a volume, you tell Docker: "Save all the actual database files in this specific folder on my real hard drive."

---

## 5. Verification & Learning Check

### 5.1 The "Living" Check
Run `docker ps` to see your running containers. You should see something like this:
```text
CONTAINER ID   IMAGE                        STATUS          PORTS                    NAMES
a1b2c3d4e5f6   postgres:15-alpine           Up 2 minutes    0.0.0.0:5432->5432/tcp   sdas-postgres
b2c3d4e5f6g7   mongo:7.0                    Up 2 minutes    0.0.0.0:27017->27017/tcp sdas-mongodb
c3d4e5f6g7h8   keycloak:22.0.1              Up 2 minutes    0.0.0.0:8080->8080/tcp   sdas-keycloak
```

### 5.2 Checking the Logs
If a container doesn't show up, check its "Black Box" (the logs):
```bash
docker logs sdas-postgres
```

### 5.3 The Admin UI
Visit `http://localhost:8080`. If you see the Keycloak welcome screen, your infrastructure is successfully "Orchestrated"!

### 6. Checklist for Success

- [ ] **Docker**: Can you see three containers running?
- [ ] **Environment**: Do you have a `.env.local` file with all the passwords?
- [ ] **Volumes**: Do you understand why we need volumes for our databases?
- [ ] **Access**: Can you reach Keycloak at `localhost:8080`?

**Moving Forward**: Our infrastructure is alive. Now we need to set up the **CI/CD Pipeline** to automate our testing and quality checks.
