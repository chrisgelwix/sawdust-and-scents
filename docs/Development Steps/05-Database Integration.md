# Step 05: Database Integration

## 1. The "Why" Behind This Step: The Memory of the System

A full-stack application with no database is like a person with no memory. To build a store, we must save data (users, products, orders) so that it's still there when the user comes back tomorrow.

In this project, we use a **Polyglot Persistence** strategy.

- **Why?**: No single database is perfect for everything. SQL (Postgres) is best for money and orders. NoSQL (MongoDB) is best for flexible catalogs. By using both, we give our application the "Best of Both Worlds."

---

## 2. Core Concepts & Definitions

#### 2.1 ORM (Object-Relational Mapper) - TypeORM

- **Definition**: An ORM is a tool that allows you to talk to a database (like PostgreSQL) using TypeScript classes instead of writing raw SQL commands (like `SELECT * FROM users`).
- **The Lesson**: TypeORM maps your `User` class directly to a `users` table. If you add a property to the class, TypeORM can add a column to the table.

#### 2.2 ODM (Object-Document Mapper) - Mongoose

- **Definition**: Similar to an ORM, but for "Document" databases like MongoDB.
- **The Lesson**: Mongoose ensures that even though MongoDB is "schema-less," our application still follows a clear structure (Schema).

#### 2.3 Dependency Injection (DI)

NestJS uses DI to share the database connection.

- **Definition**: Instead of every service creating its own connection to the database (which would be slow and crash the server), we create the connection once in a `DatabaseModule` and "Inject" it into any service that needs it.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install Database Drivers

We need the libraries that talk to PostgreSQL and MongoDB.

```bash
# TypeORM + PostgreSQL Driver (pg)
npm install @nestjs/typeorm typeorm pg

# Mongoose + MongoDB Driver
npm install @nestjs/mongoose mongoose
```

### Step 3.2: Create the Central Database Module

Create `apps/api/src/modules/database/database.module.ts`. This is the "Utility Room" of your API.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // 1. Configure PostgreSQL (TypeORM)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        autoLoadEntities: true, // Automatically find our .entity.ts files
        synchronize:
          config.get<string>('NODE_ENV') !== 'production', // DEV ONLY!
      }),
    }),

    // 2. Configure MongoDB (Mongoose)
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: `mongodb://${config.get('MONGO_USER')}:${config.get('MONGO_PASSWORD')}@${config.get('MONGO_HOST')}:${config.get('MONGO_PORT')}/${config.get('MONGO_DB')}?authSource=admin`,
      }),
    }),
  ],
  exports: [TypeOrmModule, MongooseModule],
})
export class DatabaseModule {}
```

### 4. Deep Dive: Code Keyword Breakdown

After writing the code above, it's important to understand the specific NestJS keywords used:

#### 4.1 `.forRootAsync()`

- **Definition**: Most NestJS modules have a `.forRoot()` method for static configuration. However, when we need to wait for a service (like `ConfigService`) to provide data from a `.env` file, we use the **Async** version.
- **The Logic**: It tells NestJS: "Hold on! Don't try to connect to the database until we have successfully finished reading our configuration."

#### 4.2 `inject: [ConfigService]`

- **Definition**: This is a part of **Dependency Injection**. It tells NestJS that the `useFactory` function below _depends_ on the `ConfigService`.
- **The Logic**: NestJS will look for an instance of `ConfigService` and "hand it over" to the factory function so we can use it to fetch our database passwords.

#### 4.3 `useFactory`

- **Definition**: A "Factory" is a function that creates an object.
- **The Logic**: Instead of giving NestJS a static object with a hardcoded password, we give it a function. This function runs at startup, grabs the latest settings from your environment, and _returns_ the final configuration object that the database driver needs.

#### 4.4 `autoLoadEntities: true`

- **Definition**: In TypeORM, we define "Entities" (database tables).
- **The Logic**: Normally, you have to manually list every entity in your config. With `autoLoadEntities`, TypeORM will automatically scan your `apps/api/src` folder and find any file ending in `.entity.ts`. This saves you from forgetting to register a new table!

#### 4.5 `synchronize`

- **Definition**: A feature that syncs your database schema with your code.
- **The Logic**: If you add a `phoneNumber` field to your User class, TypeORM will see it and automatically run the `ALTER TABLE` command in Postgres to add that column.
- **CRITICAL BEST PRACTICE**: Only use this in Development. In Production, we use **Migrations** to ensure we never accidentally lose data.

---

## 5. Verification & Learning Check

### 5.1 The Startup Test

Run: `npx nx serve api`.

- **The Lesson**: Watch the console. You should see `TypeOrmCoreModule dependencies initialized` and `MongooseCoreModule dependencies initialized`. This confirms the "Handshake" between your code and the two databases is complete.

### 5.2 Manual Inspection

Open **MongoDB Compass** and use the connection string from your `.env.local`.

- **The Lesson**: If you can see the `sdas_catalog` database, you have successfully "Pierced the Veil" into your NoSQL container.

### 6. Checklist for Success

- [ ] **Connections**: Does the API start without "Connection Refused" errors?
- [ ] **Secrets**: Are `POSTGRES_USER` and `MONGO_USER` being read from `.env.local`?
- [ ] **Exports**: Is `DatabaseModule` exporting the two modules?
- [ ] **Security**: Is `synchronize` set to `false` if `NODE_ENV` is production?

**Moving Forward**: Now that we have a memory, we need a way to know _who_ is talking to us. We'll integrate **Keycloak Authentication** next to secure our data.
