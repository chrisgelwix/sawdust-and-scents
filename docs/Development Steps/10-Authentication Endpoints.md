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

A **Controller** acts as a traffic cop. It listens for specific types of requests (GET, POST, DELETE) and directs them to the correct business logic.

#### 2.2 JWT Extraction (Unwrapping the ID)

When a user is logged in, their browser sends a `Bearer <token>` in the header. Our Controller needs to "un-wrap" (decode) this token to find the user's real information.

#### 2.3 Custom Decorators (The Shortcut)

Instead of manually digging through the "Request" object every time we need a user ID, we create a **Custom Decorator**. It acts as a "Direct Pipe" to the user's data.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the User Decorator

Create `apps/api/src/modules/auth/decorators/user.decorator.ts`. This is the shortcut that extracts the user from the JWT.

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthenticatedUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Keycloak bouncer puts the user info here
  },
);
```

### Step 3.2: Generate the Auth Controller

Run this command to create the file structure:
```bash
npx nx generate @nx/nest:controller apps/api/src/modules/auth/auth --no-interactive
```

### Step 3.3: Implement the Profile Endpoint

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

### Step 3.4: Register the Controller in the Auth Module

For NestJS to recognize your new routes, the controller must be listed in the module. Update `apps/api/src/modules/auth/auth.module.ts`.

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from 'nest-keycloak-connect';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller'; // Add this import

@Module({
  imports: [
    KeycloakConnectModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        authServerUrl: config.get('KEYCLOAK_URL'),
        realm: config.get('KEYCLOAK_REALM'),
        clientId: config.get('KEYCLOAK_CLIENT_ID'),
        secret: config.get('KEYCLOAK_CLIENT_SECRET') || '',
        cookieKey: 'KEYCLOAK_JWT',
        logLevels: ['verbose'],
        useNestLogger: true,
      }),
    }),
  ],
  controllers: [AuthController], // Add this line
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ResourceGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class AuthModule {}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `createParamDecorator`

- **The Logic**: A NestJS utility used to create custom `@Decorators`. It allows you to "Peek" inside the incoming HTTP Request and grab exactly what you want (like the User object) before the code reaches your function.

#### 4.2 `@AuthenticatedUser()`

- **The Logic**: This is your custom shortcut. It finds the user data in the JWT and "Injects" it directly into your function.

#### 4.3 `sub` (The Subject)

- **The Logic**: In a JWT, the `sub` is the **Subject**. It is the unique, permanent ID for that user inside Keycloak. You should always use this ID (instead of an email) to link users to their orders.

---

## 5. Verification & Learning Check

### 5.1 How to get a Test Token
Before you can test the `/auth/profile` endpoint, you need a **JWT Token**. Since we haven't built the login page yet, we use a "Direct Access Grant" (a shortcut for developers).

1.  **Open your Terminal**.
2.  **Run this Command** (Replace `YOUR_CLIENT_SECRET` with the one from your `.env.local`):

```bash
# Windows (PowerShell)
$token = curl.exe -X POST "http://localhost:8080/realms/sdas-realm/protocol/openid-connect/token" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=password" `
  -d "client_id=sdas-api" `
  -d "client_secret=YOUR_CLIENT_SECRET" `
  -d "username=chris_worker" `
  -d "password=your_password"

# To see just the token:
($token | ConvertFrom-Json).access_token
```

```bash
# Mac/Linux (Bash)
curl -X POST "http://localhost:8080/realms/sdas-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=sdas-api" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=chris_worker" \
  -d "password=your_password" | jq .access_token
```

### 5.2 The Token Test

1.  **Restart the API**: `npx nx serve api`.
2.  **Authorize**: Open `/docs`, click "Authorize," and paste a valid Keycloak token.
3.  **Execute**: Run the `/auth/profile` endpoint.

- **The Lesson**: Look at the response. You'll see data that _only Keycloak knows_. This proves your Controller is successfully decoding the encrypted token sent by the user.

### 6. Checklist for Success

- [ ] **Decorator**: Did you create `user.decorator.ts`?
- [ ] **Controller**: Is it registered in the `AuthModule`?
- [ ] **Lock Icon**: Do you see the "Lock" on your routes in Swagger?
- [ ] **Identity**: Does the response include the `sub` ID?

**Congratulations!** You have built a secure, dual-database, monorepo-based foundation for a professional e-commerce platform.
