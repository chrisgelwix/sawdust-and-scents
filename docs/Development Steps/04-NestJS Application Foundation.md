# Step 04: NestJS Application Foundation

## 1. The "Why" Behind This Step: Architectural Discipline

Building an API is not just about creating routes like `/get-products`. It's about building a **scalable system**. If you don't set up a strong foundation early, your code will quickly become a "Big Ball of Mud"—where changing one thing breaks ten others.

In this step, we configure the "Global Rules" of our API. This ensures every developer follows the same patterns for validation, security, and documentation.

---

## 2. Core Concepts & Definitions

#### 2.1 NestJS (The Framework)

NestJS is a "Progressive" Node.js framework. It provides a strict **Architecture** out of the box.

- **Modules**: The building blocks. They group related code (e.g., all Product logic).
- **Controllers**: Handle incoming HTTP requests (GET, POST).
- **Services**: Handle the "Business Logic" (e.g., calculating a discount).

#### 2.2 Swagger / OpenAPI

An API is useless if nobody knows how to use it.

- **Definition**: Swagger is a tool that reads your code and automatically generates an interactive website. It shows every available URL, what data it expects, and what it returns. This is "Living Documentation" because it updates itself every time you change your code.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Foundation Libraries

We need tools for documentation and data validation.

```bash
# @nestjs/swagger: Documentation engine
# swagger-ui-express: The website that displays the docs
# @nestjs/config: Securely reads .env files
# class-validator/transformer: Power the ValidationPipe
npm install @nestjs/swagger swagger-ui-express @nestjs/config class-validator class-transformer
```

### Step 3.2: Configure the Global Entry Point (`main.ts`)

Update `apps/api/src/main.ts`. This is the "brain" that starts your server.

```typescript
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefix all routes with /api
  app.setGlobalPrefix('api');

  // 2. Enable CORS
  app.enableCors();

  // 3. Enable Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // 4. Configure Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Sawdust and Scents API')
    .setDescription(
      'The core API for the Sawdust and Scents platform'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(
    app,
    config
  );
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/api`
  );
  Logger.log(
    `📖 API Documentation available at: http://localhost:${port}/docs`
  );
}
bootstrap();
```

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `NestFactory.create(AppModule)`

- **Definition**: This is the "Spark" that ignes the entire application engine.
- **The Logic**: It tells NestJS: "Read the `AppModule`, find all its dependencies, wire them together, and start a web server."

#### 4.2 `setGlobalPrefix('api')`

- **Definition**: A routing configuration.
- **The Logic**: It ensures every URL starts with `/api`. This is an industry standard that allows you to easily separate your "Data" (API) from your "User Interface" (Website) if they are hosted on the same domain.

#### 4.3 `app.useGlobalPipes(...)`

- **Definition**: A "Pipe" is a filter that sits between the user and your controller.
- **The Logic**: By making it **Global**, we ensure that _every single_ piece of data entering our API is checked automatically. You don't have to manually validate data in every single route.

#### 4.4 `whitelist: true`

- **Definition**: A security configuration for the ValidationPipe.
- **The Logic**: If a hacker tries to send a field called `isAdmin: true` to a route that only expects a `name`, NestJS will "Whiten" the data by deleting the illegal field before it reaches your code.

#### 4.5 `DocumentBuilder`

- **Definition**: A "Builder Pattern" class from the Swagger library.
- **The Logic**: Instead of writing a complex JSON file by hand to describe your API, you use these human-readable methods (`setTitle`, `setVersion`) to describe it in your code.

---

## 5. Verification & Learning Check

### 5.1 The Documentation Portal

Start the API: `npx nx serve api`. Navigate to `http://localhost:3000/docs`.

- **The Lesson**: Even though you haven't written a single "Product" route yet, Swagger is alive. This is your "Workbench." Throughout the rest of the project, you will use this page to test your code instead of browser tabs.

### 6. Checklist for Success

- [ ] **Access**: Can you reach `/docs`?
- [ ] **CORS**: Is `app.enableCors()` present in `main.ts`?
- [ ] **Validation**: Is the `ValidationPipe` active?

**Moving Forward**: We've set the rules, but we have no way to describe our data yet. Before we connect the database, we need a shared language between the frontend and backend. We'll build the **Shared Types Library** next.
