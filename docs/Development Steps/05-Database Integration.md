# Step 05: Database Integration

## 1. The "Why" Behind This Step: The Long-Term Memory

A full-stack application with no database is like a person with no memory. To build a store, we must save data (users, products, orders) so that it's still there when the user comes back tomorrow.

In this project, we use a **Polyglot Persistence** strategy.
- **The Analogy**: Imagine a "Library." 
    - Some books are huge, heavy, and very important (like your bank records). These are stored in a **Safe** (PostgreSQL).
    - Other things are quick notes, pictures, or flyers that change all the time (like a product catalog). These are stored in a **Bulletin Board** (MongoDB).
- **The Logic**: No single database is perfect for everything. SQL is best for money and orders. NoSQL is best for flexible catalogs. By using both, we give our application the "Best of Both Worlds."

---

## 2. Core Concepts & Definitions

#### 2.1 ORM (Object-Relational Mapper) - TypeORM

- **Definition**: An ORM is a tool that allows you to talk to a database (like PostgreSQL) using TypeScript classes instead of writing raw SQL commands (like `SELECT * FROM users`).
- **The Logic**: It translates your code into database language. If you add a property to the class, TypeORM can add a column to the table automatically.

#### 2.2 ODM (Object-Document Mapper) - Mongoose

- **Definition**: Similar to an ORM, but for "Document" databases like MongoDB.
- **The Logic**: Mongoose ensures that even though MongoDB is "flexible," our application still follows a clear structure (a Schema).

#### 2.3 Dependency Injection (DI)

- **Definition**: A pattern where a class receives its dependencies from an external source rather than creating them itself.
- **The Logic**: Instead of every service creating its own slow connection to the database, we create the connection once in a `DatabaseModule` and "Inject" it into any service that needs it. This keeps our app fast and organized.

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
        synchronize: config.get<string>('NODE_ENV') !== 'production',
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

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `.forRootAsync()`

- **The Logic**: Most modules have a `.forRoot()` for simple setup. But when we need to wait for another service (like `ConfigService`) to finish reading our `.env` file, we use the **Async** version. It tells NestJS: "Hold on! Don't try to connect until the configuration is ready."

#### 4.2 `inject: [ConfigService]`

- **The Logic**: This is a part of **Dependency Injection**. It tells NestJS that the `useFactory` function below _depends_ on the `ConfigService`. NestJS will find the service and "hand it over" so we can use it to fetch our database passwords.

#### 4.3 `useFactory`

- **The Logic**: A "Factory" is a function that creates an object. Instead of hardcoding a password, we give NestJS a function that runs at startup, grabs the latest settings from your environment, and _returns_ the final configuration object.

#### 4.4 `autoLoadEntities: true`

- **The Logic**: In TypeORM, we define "Entities" (database tables). Normally, you have to manually list every entity. With `autoLoadEntities`, TypeORM will automatically scan your `apps/api/src` folder and find any file ending in `.entity.ts`.

#### 4.5 `synchronize`

- **The Logic**: A feature that syncs your database schema with your code. If you add a `phoneNumber` to your User class, TypeORM will see it and automatically add that column to PostgreSQL.
- **CRITICAL**: Only use this in Development. In Production, we use **Migrations** to ensure we never accidentally lose or corrupt data.

---

## 5. Verification & Learning Check

### 5.1 The Startup Test

Run `npx nx serve api`.

- **The Lesson**: Watch the console. You should see messages like `TypeOrmCoreModule dependencies initialized`. This confirms the "Handshake" between your code and the two databases is complete.

### 6. Checklist for Success

- [ ] **Connections**: Does the API start without "Connection Refused" errors?
- [ ] **Secrets**: Are your passwords being read from `.env.local`?
- [ ] **Exports**: Is `DatabaseModule` exporting the two modules for others to use?
- [ ] **Terminology**: Can you explain the difference between an ORM and an ODM?

**Moving Forward**: Now that we have a memory, we need a way to know _who_ is talking to us. We'll integrate **Keycloak Authentication** next to secure our data.
