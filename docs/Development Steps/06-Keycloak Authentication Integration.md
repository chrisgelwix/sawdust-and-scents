# Step 06: Keycloak Authentication Integration

## 1. The "Why" Behind This Step: The Security Bouncer

Security is the most critical and complex part of any modern application. If you build your own login system, you are responsible for safely hashing passwords, protecting against brute-force attacks, and handling "Forgot Password" emails. 

**The Solution**: We use **Keycloak**.
- **The Analogy**: Imagine a "VIP Club" with a very strict **Bouncer** (Keycloak). 
    - The bouncer stands at the front door of the entire club (your API). 
    - When a guest arrives, the bouncer checks their ID (the **JWT**). 
    - If the ID is valid, the bouncer gives them a wristband. 
    - Some rooms in the club (like the "Admin Dashboard") require a "VIP Wristband" (a **Role**). 
    - By using Keycloak, we stop being "Password Managers" and start being "Service Providers."

---

## 2. Core Concepts & Definitions

#### 2.1 Authentication vs. Authorization

- **Authentication**: "Who are you?" (The act of logging in).
- **Authorization**: "What are you allowed to do?" (Do you have the 'admin' role?).

#### 2.2 JWT (JSON Web Token)

When a user logs in, Keycloak gives them a **JWT**. It is a signed, encrypted-looking string that has three parts:
- **Header**: Tells the API which algorithm was used to sign the token.
- **Payload**: Contains "Claims" (data) about the user, like their email, name, and roles.
- **Signature**: A cryptographic hash that proves the token hasn't been tampered with.

#### 2.3 The "Bouncer" Guards

We use three types of guards to protect our API:
1.  **AuthGuard**: Checks if the user is logged in (has a valid JWT).
2.  **RoleGuard**: Checks if the user has a specific role (e.g., "admin").
3.  **ResourceGuard**: Checks if the user has permission to access a specific resource.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Security Adapter

We use the official community adapter for NestJS.

```bash
# --legacy-peer-deps: Needed for NestJS 11 compatibility
npm install nest-keycloak-connect keycloak-connect --legacy-peer-deps
```

### Step 3.2: Configure the Auth Module

Update `apps/api/src/modules/auth/auth.module.ts`. This configuration sets up the "Shield" for your entire API.

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
  providers: [
    // Register the 3 core guards globally
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ResourceGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class AuthModule {}
```

### Step 3.3: Create the "Public" Decorator

Sometimes we want a route to be open to everyone (like the home page). Create `apps/api/src/modules/auth/decorators/public.decorator.ts`.

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'unprotected';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `APP_GUARD`

- **The Logic**: Normally, a Guard only protects one specific route. By providing a guard using `APP_GUARD`, you are telling NestJS: "Make this guard global. I want it to protect **every single route** in the entire application automatically."

#### 4.2 `registerAsync`

- **The Logic**: We cannot connect to Keycloak until we know the URL and Realm from our `.env` file. We use `registerAsync` to wait for the `ConfigService` to be ready before initializing the bouncer.

#### 4.3 `unprotected`

- **The Logic**: This is the secret keyword that the `nest-keycloak-connect` library looks for. If it sees this tag on a route, it will step aside and let the user through without checking for a token.

#### 4.4 `cookieKey: 'KEYCLOAK_JWT'`

- **The Logic**: While we usually use headers, this allows the adapter to also look for a token inside a browser cookie. This is useful for traditional web applications where you don't want to manually handle headers in JavaScript.

---

## 5. Verification & Learning Check

### 5.1 The Barrier Test

Run `npx nx serve api`. Try to visit `http://localhost:3000/api/some-secure-route`.

- **The Lesson**: You should get a `401 Unauthorized`. This confirms that your "Safety Gate" is built and the Guards are blocking unauthenticated traffic.

### 6. Checklist for Success

- [ ] **Guards**: Are all 3 guards (Auth, Resource, Role) listed in `providers`?
- [ ] **Public Decorator**: Did you use the keyword `unprotected`?
- [ ] **Verification**: Do you get a 401 error when visiting a protected route?
- [ ] **Terminology**: Can you explain the difference between Authentication and Authorization?

**Moving Forward**: We have a secure API and a database. Now it's time to define exactly what our "Orders" and "Users" look like. We'll build the **PostgreSQL Models and Services** next.
