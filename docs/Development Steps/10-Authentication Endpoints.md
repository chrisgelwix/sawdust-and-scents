# Step 10: Authentication Endpoints

## 1. The "Why" Behind This Step: The Front Door

We have integrated Keycloak (the Security Engine), but we haven't given our users a way to interact with it yet. We need specific URLs (**Endpoints**) that allow the frontend to ask: "Who am I?" and "What is my role?"

**The Solution**: We build the **Authentication Controller**.
- **The Analogy**: Imagine a "Front Door" (the Controller).
    - If the Service is the "Brain" of the house, the Controller is the **Front Door**.
    - It's the only part that the outside world (the internet) is allowed to touch.
    - It receives the "Knock" (the HTTP Request), checks the guest's ID, and then passes them to the right room.

---

## 2. Core Concepts & Definitions

#### 2.1 REST Controllers (The Traffic Cop)

A **Controller** acts as a traffic cop. It listens for specific types of requests (GET, POST, DELETE) and directs them to the correct business logic. In NestJS, we use decorators to define these routes effortlessly.

#### 2.2 JWT Extraction (Unwrapping the ID)

When a user is logged in, their browser sends a `Bearer <token>` in the "Authorization" header. It looks like a long string of gibberish. Our Controller needs to "un-wrap" (decode) this token to find the user's real information, like their email and unique ID.

#### 2.3 Swagger Documentation (The User Manual)

We use Swagger decorators to make our API "Self-Documenting." This ensures that anyone who looks at our `/docs` page knows exactly which routes are secure and what data they return.

---

## 3. Step-by-Step Implementation

### Step 3.1: Generate the Auth Controller

Run this command to create the file structure:
```bash
npx nx generate @nx/nest:controller apps/api/src/modules/auth/auth
```

### Step 3.2: Implement the Profile Endpoint

Update `apps/api/src/modules/auth/auth.controller.ts`.

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticatedUser } from './decorators/user.decorator';

@ApiTags('auth') // Groups these routes together in Swagger
@Controller('auth')
export class AuthController {
  
  @Get('profile')
  @ApiBearerAuth() // Adds the "Lock" icon in Swagger
  @ApiOperation({ summary: 'Get the currently logged in user profile' })
  getProfile(@AuthenticatedUser() user: any) {
    // The @AuthenticatedUser decorator has already done 
    // the hard work of unwrapping the JWT for us!
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      roles: user.resource_access?.['sdas-api']?.roles || [],
    };
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Controller('auth')`

- **The Logic**: It tells NestJS: "Any request starting with `/auth` should be handled by this class." It's like an address for your API. Because we have a global prefix of `api`, the final address is `http://localhost:3000/api/auth`.

#### 4.2 `@Get('profile')`

- **The Logic**: It defines the final part of the URL. This function will run whenever someone makes a `GET` request to `/api/auth/profile`.

#### 4.3 `@AuthenticatedUser()` (The Shortcut)

- **The Logic**: Normally, you'd have to write 5 lines of code to dig through the "Request" object to find the user's ID. This decorator is a "Shortcut." It finds the user data in the JWT and "Injects" it directly into your function as a variable.

#### 4.4 `sub` (The Subject)

- **The Logic**: In a JWT, the `sub` is the **Subject**. It is the unique, permanent ID for that user inside Keycloak. You should always use this ID (instead of an email) to link users to their orders, because emails can change, but the `sub` is forever.

#### 4.5 `@ApiBearerAuth()`

- **The Logic**: This is purely for the Documentation. It adds a "Lock" icon to this route in Swagger UI, signaling to other developers that they need to be logged in to test this endpoint.

---

## 5. Verification & Learning Check

### 5.1 The Token Test

1.  **Restart the API**: `npx nx serve api`.
2.  **Authorize**: Open `/docs`, click "Authorize," and paste a valid Keycloak token.
3.  **Execute**: Run the `/auth/profile` endpoint.

- **The Lesson**: Look at the response. You'll see data that _only Keycloak knows_. This proves your Controller is successfully decoding the encrypted token sent by the user.

### 6. Checklist for Success

- [ ] **Controller**: Is it registered in the `AuthModule`?
- [ ] **Lock Icon**: Do you see the "Lock" on your routes in Swagger?
- [ ] **Identity**: Does the response include the `sub` ID?
- [ ] **Analogy**: Can you explain why the Controller is the "Front Door"?

**Congratulations!** You have built a secure, dual-database, monorepo-based foundation for a professional e-commerce platform.
