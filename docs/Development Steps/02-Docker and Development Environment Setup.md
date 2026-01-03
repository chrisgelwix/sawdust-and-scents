# Step 02: Docker and Development Environment Setup

## 1. The "Why" Behind This Step: Environment Parity

A common frustration in development is the "It works on my machine" syndrome. One developer might have PostgreSQL 14 installed locally, while another has PostgreSQL 15, or a different version of MongoDB. These tiny differences lead to "Ghost Bugs" that are impossible to reproduce.

**Containerization** solves this. By using **Docker**, we define our entire infrastructure as code. Every developer—and eventually our production server—will run the exact same versions of every service.

---

## 2. Core Concepts & Definitions

#### 2.1 Docker

A **Docker Container** is a lightweight, standalone package that includes everything needed to run a piece of software: code, runtime, system tools, and libraries. It's like a "mini-computer" inside your computer that only runs one thing (like a database).

#### 2.2 Docker Compose

If Docker is the container, **Docker Compose** is the "Conductor." It allows us to manage multiple containers at once. Instead of running three different commands to start Postgres, Mongo, and Keycloak, we use one command to start the entire "orchestra."

#### 2.3 Persistence & Volumes

By default, Docker containers are "Ephemeral." This means if you turn the container off, all the data inside it (your users, your products) disappears.

- **Definition: Volume**: A volume "maps" a folder on your physical hard drive to a folder inside the container. Even if the container is deleted, the data remains safe on your hard drive.

#### 2.4 Relational (SQL) vs. Document (NoSQL) Databases

In this project, we use both. This is called **Polyglot Persistence**.

- **PostgreSQL (Relational)**: Stores data in tables with strict columns. Best for data that requires integrity, like Orders and Transactions.
- **MongoDB (Document)**: Stores data as JSON-like documents. Best for data that is flexible and changes often, like a Product Catalog.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Infrastructure Blueprint (`docker-compose.yml`)

Create a file named `docker-compose.yml` in your project root. This file tells Docker exactly which services we need.

```yaml
version: '3.8' # The version of the Compose file format

services:
  # 1. PostgreSQL - Our "Record of Truth"
  postgres:
    image: postgres:15-alpine # Use a lightweight, stable version
    container_name: sdas-postgres
    restart: always # Start automatically if it crashes
    environment:
      # We use ${VAR:-default} syntax to pull from .env or use a default
      POSTGRES_USER: ${POSTGRES_USER:-sdas_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-sdas_password}
      POSTGRES_DB: ${POSTGRES_DB:-sdas_db}
    ports:
      - '5432:5432' # Map [Your Computer]:[Inside Docker]
    volumes:
      - postgres_data:/var/lib/postgresql/data # Persistence

  # 2. MongoDB - Our Flexible Catalog
  mongodb:
    image: mongo:7.0
    container_name: sdas-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER:-sdas_admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-sdas_password}
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db

  # 3. Keycloak - Our Security Guard
  keycloak:
    image: quay.io/keycloak/keycloak:22.0.1
    container_name: sdas-keycloak
    restart: always
    environment:
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HTTP_ENABLED: 'true'
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN:-sdas_admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-sdas_admin}
    ports:
      - '8080:8080'
    command: start-dev # Run in development mode
    depends_on:
      - postgres # Keycloak needs a DB to store its own data

volumes:
  # Declare our persistent storage areas
  postgres_data:
  mongodb_data:
```

### 4. Deep Dive: Docker Keyword Breakdown

#### 4.1 `image: postgres:15-alpine`

- **Definition**: The "Source Code" for the container.
- **The Logic**: `postgres` is the software, `15` is the version, and `alpine` is the "Flavor." Alpine is an extremely small Linux distribution (only 5MB!), which makes your containers faster to download and more secure because they have less "extra" software for hackers to exploit.

#### 4.2 `environment:`

- **Definition**: A list of "Settings" passed into the container.
- **The Logic**: This is how we tell Postgres what its password should be. We use the syntax `${VAR:-default}`, which means: "Look for this variable in my `.env.local` file. If you don't find it, use this default value."

#### 4.3 `ports: ["5432:5432"]`

- **Definition**: A "Bridge" between your physical computer and the virtual container.
- **The Logic**: The first number is your computer's port. The second is the container's port. This allows you to use a tool like MongoDB Compass on your desktop to talk to the database hidden inside the container.

#### 4.4 `volumes:`

- **Definition**: A permanent storage link.
- **The Logic**: Containers are like "Snapshots"—when you delete them, they reset to zero. By "Mapping" a volume, you tell Docker: "Save all the actual database files in this specific folder on my real hard drive." This is why your data is still there when you restart your computer.

#### 4.5 `depends_on:`

- **Definition**: A sequencing rule.
- **The Logic**: Keycloak cannot start until its database (Postgres) is ready. `depends_on` ensures that Docker starts Postgres _first_, then waits a moment before starting Keycloak.

---

## 5. Verification & Learning Check

### 5.1 Container Health

Run `docker ps`.

- **The Lesson**: If you don't see three containers, one of them crashed. Run `docker logs sdas-keycloak` to see why. Usually, it's because another program on your computer is already using port 8080 or 5432.

### 5.2 The Admin UI

Visit `http://localhost:8080` in your browser.

- **The Lesson**: This proves that Keycloak is running and has successfully connected to the Postgres container to create its own internal tables.

### 6. Checklist for Success

- [ ] **Docker**: Are all 3 services listed in `docker ps`?
- [ ] **Persistence**: Did Docker create the `postgres_data` and `mongodb_data` volumes?
- [ ] **Environment**: Is `.env.local` correct and listed in `.gitignore`?
- [ ] **Access**: Can you reach the Keycloak login screen?

**Moving Forward**: With our local environment stable, we need to ensure that every time we write code, it's automatically checked for quality. We'll set up the **CI/CD Pipeline** next.
