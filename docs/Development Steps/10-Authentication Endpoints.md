# Step 10: Authentication Endpoints

## 1. The "Why" Behind This Step: The Front Door

We have integrated Keycloak (the Security Engine), but we haven't given our users a way to interact with it. We need specific URLs (**Endpoints**) that allow the frontend to ask: "Who am I?" and "What is my role?"

This step is about creating the **Controller** layer. If the Service is the "Brain," the Controller is the "Skin"—it's the only part the outside world (the internet) can touch.

---

## 2. Core Concepts & Definitions

#### 2.1 REST Controllers

- **Definition**: A class that handles incoming HTTP requests. It acts as the traffic controller, routing a `GET` request to one function and a `POST` request to another.

#### 2.2 JWT Extraction

- **Definition**: When a user is logged in, their browser sends a `Bearer <token>` in the header. Our Controller needs to "un-wrap" this token to find the user's information.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Auth Controller

```bash
npx nx generate @nx/nest:controller apps/api/src/modules/auth/auth
```

### Step 3.2: Implement the Profile Endpoint

Update `apps/api/src/modules/auth/auth.controller.ts`.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticatedUser } from './decorators/user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('profile')
  @ApiBearerAuth()
  getProfile(@AuthenticatedUser() user: any) {
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      roles:
        user.resource_access?.['sdas-api']?.roles || [],
    };
  }
}
```

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Controller('auth')`

- **Definition**: A class decorator.
- **The Logic**: It tells NestJS: "Any request starting with `/auth` should be handled by this class." It's like an address for your API.

#### 4.2 `@Get('profile')`

- **Definition**: A method decorator.
- **The Logic**: It defines the final part of the URL. Combined with the controller prefix, this function will run whenever someone makes a `GET` request to `/api/auth/profile`.

#### 4.3 `@AuthenticatedUser()`

- **Definition**: A custom **Param Decorator** (the one we built in Step 6).
- **The Logic**: This is a shortcut. Instead of digging through the entire "Request" object to find the user's data, you just use this decorator. NestJS will automatically find the user data from the JWT and hand it to you in the `user` variable.

#### 4.4 `sub` (Subject)

- **Definition**: A standard field in a JWT token.
- **The Logic**: In the world of security, the `sub` is the **Subject**. It is the unique, permanent ID for that user inside Keycloak. You should always use this ID (instead of an email) to link users to their data, because emails can change, but the `sub` is forever.

#### 4.5 `@ApiBearerAuth()`

- **Definition**: A Swagger decorator.
- **The Logic**: This is purely for the Documentation. It adds a "Lock" icon to this route in Swagger UI, signaling to other developers that they need to be logged in to test this endpoint.

---

## 5. Verification & Learning Check

### 5.1 The Token Test

1.  Log into Keycloak and get a token.
2.  Open your Swagger UI (`/docs`).
3.  Click **Authorize** and paste your token.
4.  Run the `/auth/profile` endpoint.

- **The Lesson**: Look at the response. You'll see data that _only Keycloak knows_. This proves your Controller is successfully "Decoding" the encrypted badge sent by the user.

### 6. Checklist for Success

- [ ] **Controller**: Is it registered in the `AuthModule`?
- [ ] **Swagger**: Do you see the "Lock" icons on your routes in `/docs`?
- [ ] **Extraction**: Does `getProfile` return the `sub` ID?

**Congratulations!** You've built a secure, dual-database, monorepo-based foundation.
