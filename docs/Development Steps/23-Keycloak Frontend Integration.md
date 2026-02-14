# Step 20: Keycloak Frontend Integration

## 1. The "Why" Behind This Step: The Handshake

In Step 06, we locked the Backend doors with Keycloak. Now, our Frontend needs the **Key** to those doors.

**The Strategy**: We integrate the **Keycloak JavaScript Adapter**.
- **The Analogy**: Imagine you are checking into a hotel.
    - **Keycloak Server**: The front desk that verifies your ID.
    - **JS Adapter**: The key card they give you.
    - **The Frontend**: The person holding the card. 
    - You must show the card to the elevator (the Frontend Routes) and the door (the Backend API) to get in.

---

## 2. Core Concepts & Definitions

#### 2.0 Keycloak Pre-requisites (CORS & Redirects)
For the Frontend to talk to Keycloak, you must update your `sdas-api` client settings in the Keycloak Admin Console (from **Step 06b**):
- **Web Origins**: Set to `http://localhost:4200` (or `*` for development). This allows "CORS" so the browser doesn't block the login request.
- **Valid Redirect URIs**: Set to `http://localhost:4200/*`. This tells Keycloak where it is safe to send the user back to after they log in.

#### 2.1 The Silent Refresh

- **Definition**: Automatically getting a new key card before the old one expires.
- **The Logic**: We don't want the customer to be logged out in the middle of a checkout. The adapter handles "Refreshing" the token in the background.

#### 2.2 JWT Decoding

- **The Logic**: The frontend doesn't just send the token; it also reads it to know the user's name and roles (e.g., "Welcome back, Chris!").

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Keycloak Adapter

```bash
npm install keycloak-js
```

### Step 3.2: Create the Auth Context

Create `apps/web/src/app/context/auth-context.tsx`. This acts as the "ID Holder" for the whole app.

```tsx
import React, { createContext, useEffect, useState, useContext } from 'react';
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'sdas-realm',
  clientId: 'sdas-api',
});

const AuthContext = createContext({ authenticated: false, user: null as any });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuth] = useState({ authenticated: false, user: null });

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso' }).then((authenticated) => {
      setAuth({ authenticated, user: keycloak.tokenParsed });
    });
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Step 3.3: Wrap the App in Security

Update `apps/web/src/main.tsx`.

```tsx
import { AuthProvider } from './app/context/auth-context';

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `check-sso`

- **The Logic**: "SSO" stands for Single Sign-On. When the app loads, `check-sso` silently asks Keycloak: "Is this person already logged in from another tab?" If yes, they are logged in automatically.

#### 4.2 `tokenParsed`

- **The Logic**: This is where the JS Adapter does the "Unwrapping." It converts the encrypted JWT string into a regular JavaScript object so you can easily access `user.name` or `user.email`.

#### 4.3 `AuthProvider` (Context API)

- **The Logic**: By wrapping the app in this provider, we ensure that **any** component (even a tiny button 10 levels deep) can instantly know who the user is by calling `useAuth()`.

---

## 5. Verification & Learning Check

### 5.1 The "Identity" Test

1.  **Add a Login Button**: In your `App.tsx`, show the user's name if they are logged in.
2.  **Login**: Go to Keycloak, create a user, and log in via your app.
3.  **The Lesson**: If you see your email address on the screen, the "Handshake" between your React app and the Keycloak server is successful!

### 6. Checklist for Success

- [ ] **Adapter**: Is `keycloak-js` installed?
- [ ] **Config**: Do the URL and Realm match your `.env.local`?
- [ ] **Context**: Is the `AuthProvider` wrapping your root component?

**Congratulations!** You have a secure, full-stack application foundation. Next, we'll build the **Main Layout and Navigation** to make the site look like a real store!

