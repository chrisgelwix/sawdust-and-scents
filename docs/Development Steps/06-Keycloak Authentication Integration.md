# Step 06: Keycloak Authentication Integration

## 1. The "Why" Behind This Step: The Sovereign Identity

Security is the most critical and complex part of any modern application. If you build your own login system, you are responsible for:

1.  Safely hashing passwords (and rotating salts).
2.  Managing "Forgot Password" emails.
3.  Protecting against Brute Force attacks.
4.  Handling Multi-Factor Authentication (MFA).

By integrating **Keycloak**, we offload these massive risks to a specialized, industry-standard **Identity and Access Management (IAM)** server. We stop being "Password Managers" and start being "Service Providers."

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

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Security Adapter

We use the official community adapter for NestJS.

**Note on NestJS 11**: If you receive an `ERESOLVE` error regarding peer dependencies, it is because this library is still catching up to NestJS 11. You can safely bypass this using the `--legacy-peer-deps` flag.

```bash
# nest-keycloak-connect: The bridge between NestJS and Keycloak
# keycloak-connect: The underlying logic for talking to the Keycloak server
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
    // Configure the connection to the Keycloak server
    KeycloakConnectModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        authServerUrl: config.get('KEYCLOAK_URL'),
        realm: config.get('KEYCLOAK_REALM'),
        clientId: config.get('KEYCLOAK_CLIENT_ID'),
        secret: config.get('KEYCLOAK_CLIENT_SECRET'),
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

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `APP_GUARD`

- **Definition**: A special constant (token) from NestJS.
- **The Logic**: Normally, a Guard only protects one specific route. By providing a guard using `APP_GUARD`, you are telling NestJS: "Make this guard global. I want it to protect every single route in the entire application automatically."

#### 4.2 `registerAsync`

- **Definition**: A method used to configure a module that depends on another service.
- **The Logic**: We cannot connect to Keycloak until we know the URL and Realm. Since those are stored in a `.env` file, we use `registerAsync` to wait for the `ConfigService` to be ready before initializing the Keycloak connection.

#### 4.3 `AuthGuard`

- **Definition**: The "Passport Control."
- **The Logic**: This guard checks if the user provided a valid JWT token in their request header. If the token is missing or expired, it returns a `401 Unauthorized`.

#### 4.4 `RoleGuard`

- **Definition**: The "VIP Lounge Bouncer."
- **The Logic**: Even if a user is logged in, they might not be allowed to see everything. This guard looks inside the JWT token for a specific role (like `admin`). If the role is missing, it returns a `403 Forbidden`.

#### 4.5 `cookieKey: 'KEYCLOAK_JWT'`

- **Definition**: A configuration for where the token is stored.
- **The Logic**: While we usually use the `Authorization: Bearer` header, this setting allows the adapter to also look for a token inside a browser cookie. This is useful for securing traditional web pages.

---

## 5. Verification & Learning Check

### 5.1 The Barrier Test

Run `npx nx serve api`. Try to visit `http://localhost:3000/api` in your browser.

- **The Lesson**: You should get a `401 Unauthorized`. This confirms that your "Safety Gate" is built and the Guards are blocking unauthenticated traffic.

### 6. Checklist for Success

- [ ] **Guards**: Are all 3 guards (Auth, Resource, Role) listed in `providers`?
- [ ] **Config**: Does your `.env.local` have `KEYCLOAK_REALM` set to `sdas-realm`?
- [ ] **Verification**: Do you get a 401 error when visiting the API without a token?

**Moving Forward**: We have a secure API and a database. Now it's time to define exactly what our "Orders" and "Users" look like. We'll build the **PostgreSQL Models and Services** next.
