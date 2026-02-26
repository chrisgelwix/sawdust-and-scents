# Step 23b: Social Login with Keycloak Identity Providers

## 1. The "Why" Behind This Step: One Door, Many Keys

In Step 23 we connected our frontend to Keycloak with a username/password login modal. That works — but in 2025, most users expect to sign in with Google or Facebook rather than creating yet another password to forget.

**The Strategy**: We use Keycloak as an **Identity Broker**. Your app never talks to Google or Facebook directly. Instead, Keycloak handles the entire OAuth conversation with the social provider, then hands your app a standard Keycloak token — exactly the same token you already get from a username/password login. Your backend and frontend do not need to change their auth logic at all.

```
User clicks "Continue with Google"
  → Your app calls keycloak.login({ idpHint: 'google' })
  → Keycloak redirects to Google's OAuth page
  → User approves in Google
  → Google redirects back to Keycloak
  → Keycloak creates/links the user account in sdas-realm
  → Keycloak redirects back to your app with a JWT token
  → Your app receives the same token it always does
```

**The Key Insight**: Social login also doubles as registration. If the user has never logged in before, Keycloak automatically creates their account the first time they authenticate with Google. There is no separate "register" step — the social provider is the registration.

---

## 2. Core Concepts & Definitions

### 2.1 Identity Provider (IdP)

> **Definition**: A service that verifies who a user is. Google, Facebook, and GitHub are all Identity Providers.

In Keycloak terminology, when you configure Google as an Identity Provider, you are telling Keycloak: "If a user proves to Google that they are who they say they are, I will trust that proof and issue them a Keycloak token."

### 2.2 Identity Brokering

> **Definition**: Keycloak acting as the "middle man" between your app and a social provider.

Your app only speaks to Keycloak. Keycloak speaks to Google/Facebook/GitHub. This is called **brokering**. The benefit is that your app never has to implement Google's OAuth spec — Keycloak abstracts it all away.

### 2.3 `idpHint`

> **Definition**: A parameter passed to `keycloak.login()` that bypasses the Keycloak login page and sends the user directly to a specific social provider's login page.

Without `idpHint`: User → Keycloak login page (where they can choose their provider)
With `idpHint: 'google'`: User → Google login page (skipping the Keycloak page entirely)

### 2.4 Account Linking

> **Definition**: Connecting an existing username/password Keycloak account to a social provider account.

If a user has an existing account in Keycloak (`user@example.com`) and they later log in with Google using the same email, Keycloak can automatically link those two accounts — the user now has two ways to log in.

| Concept | What You Configure In | What Your App Sees |
|---|---|---|
| Google OAuth credentials | Google Cloud Console | Nothing — Keycloak handles it |
| Identity Provider | Keycloak Admin Console | Nothing — Keycloak handles it |
| `idpHint` | Your frontend code | The only change needed |
| Final JWT token | Issued by Keycloak | Same as always |

---

## 3. Part 1: Keycloak Admin Console Setup

> ⚠️ **Do this before writing any frontend code.** Validate the social login works from Keycloak's own login page first, then wire it into your UI.

### Step 3.1: Set Up Google OAuth Credentials

Before configuring Keycloak, you need a **Client ID** and **Client Secret** from Google.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select your existing one (e.g., `SDAS`)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Set **Application type** to `Web application`
6. Set **Name** to `SDAS Keycloak`
7. Under **Authorised redirect URIs**, add:
   ```
   http://localhost:8080/realms/sdas-realm/broker/google/endpoint
   ```
   > **Why this URI?** This is where Google sends the user back to after they approve the login. It must point to Keycloak, not your app. The `/broker/google/endpoint` path is a fixed Keycloak endpoint.
8. Click **Create** and copy the **Client ID** and **Client Secret** — you'll need these in the next step.

### Step 3.2: Add Google as an Identity Provider in Keycloak

1. Open Keycloak Admin Console: `http://localhost:8080`
2. Select the **sdas-realm** realm
3. In the left sidebar, click **Identity Providers**
4. Click **Add provider → Google**
5. Fill in:
   | Field | Value |
   |---|---|
   | Alias | `google` (this is the `idpHint` value you'll use in code) |
   | Client ID | Paste from Google Cloud Console |
   | Client Secret | Paste from Google Cloud Console |
   | Default Scopes | `openid email profile` |
6. Click **Save**

### Step 3.3: Validate Google Login Before Writing Code

1. Open a private/incognito browser window
2. Navigate to: `http://localhost:8080/realms/sdas-realm/protocol/openid-connect/auth?client_id=sdas-web&redirect_uri=http://localhost:4200&response_type=code`
3. The Keycloak login page should now show a **"Sign in with Google"** button
4. Click it and complete the Google login flow
5. You should be redirected back to `http://localhost:4200` — this confirms Keycloak is correctly brokering Google logins

> ✅ **If this works**, your Keycloak configuration is correct. Now you can wire it into your React components.
> ❌ **If this fails**, debug Keycloak first — do not proceed to frontend code until this step passes.

### Step 3.4: (Optional) Add GitHub as an Identity Provider

GitHub requires a different setup because it uses its own OAuth app system, not Google Cloud Console.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Homepage URL** to `http://localhost:4200`
4. Set **Authorization callback URL** to:
   ```
   http://localhost:8080/realms/sdas-realm/broker/github/endpoint
   ```
5. Copy the **Client ID** and generate a **Client Secret**
6. In Keycloak Admin → Identity Providers → Add provider → **GitHub**
7. Set **Alias** to `github`, paste the credentials, and save

### Step 3.5: (Optional) Add Facebook as an Identity Provider

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. Add the **Facebook Login** product
3. Under **Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:8080/realms/sdas-realm/broker/facebook/endpoint
   ```
4. Copy the **App ID** and **App Secret**
5. In Keycloak Admin → Identity Providers → Add provider → **Facebook**
6. Set **Alias** to `facebook`, paste the credentials, and save

---

## 4. Part 2: Frontend Implementation

Now that Keycloak is configured, we make three targeted changes to the frontend:

```
Change 1: auth-context.tsx   → add loginWithProvider() function
Change 2: LoginModal.tsx      → add social login buttons
Change 3: HeaderActions.tsx   → pass loginWithProvider to the modal
```

### Step 4.1: Update `auth-context.tsx`

We need to add `loginWithProvider` to the context interface and provide its implementation.

**What we are adding**:
- A new interface method: `loginWithProvider(provider: SocialProvider) => void`
- The implementation: `keycloak.login({ idpHint: provider })`
- A `SocialProvider` type to keep the allowed values explicit

File: `apps/web/src/app/context/auth-context.tsx`

```tsx
import { createContext, useEffect, useState, useContext, useRef } from 'react';
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js';

const keycloak = new Keycloak({
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'sdas-realm',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'sdas-web',
});

// ─── New: explicit type for supported social providers ───────────────────────
export type SocialProvider = 'google' | 'github' | 'facebook';

interface AuthContextType {
    authenticated: boolean;
    user: KeycloakTokenParsed | null;
    login: () => void;
    logout: () => void;
    loginWithCredentials: (username: string, password: string) => Promise<void>;
    loginWithProvider: (provider: SocialProvider) => void;   // ← NEW
    loginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
    authenticated: false,
    user: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    login: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logout: () => {},
    loginWithCredentials: async () => { throw new Error('Not implemented'); },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    loginWithProvider: () => {},                              // ← NEW
    loginModalOpen: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openLoginModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeLoginModal: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuth] = useState<{ authenticated: boolean; user: KeycloakTokenParsed | null }>({ authenticated: false, user: null });
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const isRun = useRef(false);

    const login = () => {
        keycloak.login().catch(err => console.error('Login failed', err));
    };

    const logout = () => {
        keycloak.logout().catch(err => console.error('Logout failed', err));
    };

    const openLoginModal = () => setLoginModalOpen(true);
    const closeLoginModal = () => setLoginModalOpen(false);

    // ─── New: redirect to a specific social provider via idpHint ─────────────
    const loginWithProvider = (provider: SocialProvider) => {
        keycloak.login({ idpHint: provider })
            .catch(err => console.error(`Social login failed (${provider})`, err));
    };

    const loginWithCredentials = async (username: string, password: string): Promise<void> => {
        try {
            const keycloakUrl = process.env.KEYCLOAK_URL as string;
            const realm = process.env.KEYCLOAK_REALM as string;
            const clientId = process.env.KEYCLOAK_CLIENT_ID as string;

            const response = await fetch(
                `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'password',
                        client_id: clientId,
                        username,
                        password
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Failed to login');
            }

            const data = await response.json();
            const decoded = JSON.parse(atob(data.access_token.split('.')[1])) as KeycloakTokenParsed;
            setAuth({ authenticated: true, user: decoded });
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    useEffect(() => {
        if (isRun.current) return;
        isRun.current = true;

        keycloak.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        })
        .then((authenticated: boolean) => {
            setAuth({ authenticated, user: keycloak.tokenParsed || null });
        })
        .catch((err) => {
            console.error('Keycloak Init Error', err);
        });
    }, []);

    return (
        <AuthContext.Provider value={{
            ...auth,
            login,
            logout,
            loginWithCredentials,
            loginWithProvider,        // ← expose to the tree
            loginModalOpen,
            openLoginModal,
            closeLoginModal
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
```

**What changed and why**:

| Change | Reason |
|---|---|
| `SocialProvider` type | Limits valid values to providers we've actually configured in Keycloak. TypeScript will warn if you typo `'gogle'`. |
| `loginWithProvider` in interface | Ensures any component that uses `useAuth()` can see this function exists. |
| `keycloak.login({ idpHint: provider })` | The Keycloak JS adapter accepts an `idpHint` option that skips the Keycloak login page and redirects straight to the social provider. |

---

### Step 4.2: Update `LoginModal.tsx`

We are adding social login buttons above the username/password form with a visual divider between them.

**The layout goal**:
```
┌─────────────────────────────────────┐
│              Sign In                │
│  ─────────────────────────────────  │
│  [G]  Continue with Google          │
│  [GH] Continue with GitHub          │
│  ─────────────────────────────────  │
│              or                     │
│  ─────────────────────────────────  │
│  Username: [_____________________]  │
│  Password: [_____________________]  │
│              [Sign In]              │
│  ─────────────────────────────────  │
│  New here? [Create Account →]       │
└─────────────────────────────────────┘
```

File: `apps/web/src/app/components/auth/LoginModal.tsx`

```tsx
import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Box,
    Divider,
    Typography
} from '@mui/material';
import { SocialProvider } from '../../context/auth-context';

// ─── Social provider display config ──────────────────────────────────────────
// Add or remove providers here. The `id` must match the Keycloak IdP alias.
const SOCIAL_PROVIDERS: { id: SocialProvider; label: string; color: string; textColor: string }[] = [
    { id: 'google',   label: 'Continue with Google',  color: '#fff',    textColor: '#3c4043' },
    { id: 'github',   label: 'Continue with GitHub',  color: '#24292e', textColor: '#fff'    },
    // Uncomment when you configure Facebook in Keycloak:
    // { id: 'facebook', label: 'Continue with Facebook', color: '#1877f2', textColor: '#fff' },
];

interface LoginModalProps {
    open: boolean;
    onClose: () => void;
    onLogin: (username: string, password: string) => Promise<void>;
    onLoginWithProvider: (provider: SocialProvider) => void;  // ← NEW
}

export const LoginModal: React.FC<LoginModalProps> = ({
    open,
    onClose,
    onLogin,
    onLoginWithProvider
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await onLogin(username, password);
            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm">
            <DialogTitle
                variant="h6"
                color="primary"
                align="center">
                Sign In
            </DialogTitle>

            <DialogContent>

                {/* ── Social Login Buttons ──────────────────────────────── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                    {SOCIAL_PROVIDERS.map((provider) => (
                        <Button
                            key={provider.id}
                            variant="outlined"
                            fullWidth
                            onClick={() => onLoginWithProvider(provider.id)}
                            sx={{
                                bgcolor: provider.color,
                                color: provider.textColor,
                                borderColor: '#dadce0',
                                textTransform: 'none',
                                fontWeight: 500,
                                '&:hover': {
                                    bgcolor: provider.color,
                                    filter: 'brightness(0.95)',
                                    borderColor: '#aaa',
                                },
                            }}>
                            {provider.label}
                        </Button>
                    ))}
                </Box>

                {/* ── Divider ───────────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', my: 2, gap: 1 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography variant="body2" color="text.secondary">or</Typography>
                    <Divider sx={{ flex: 1 }} />
                </Box>

                {/* ── Username / Password Form ──────────────────────────── */}
                <TextField
                    label="User Name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    autoFocus
                    sx={{ mb: 2 }} />

                <TextField
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    type="password"
                    sx={{ mb: 2 }} />

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    onClick={handleSubmit}>
                    {loading ? 'Loading...' : 'Sign In'}
                    {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>

                {/* ── Error ─────────────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                </Box>

                {/* ── Register Link ─────────────────────────────────────── */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">New here?</Typography>
                    <Button
                        size="small"
                        onClick={onClose}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Create Account →
                    </Button>
                </Box>

            </DialogContent>
        </Dialog>
    );
};
```

**Key decisions explained**:

| Decision | Reason |
|---|---|
| `SOCIAL_PROVIDERS` array at the top | Adding a new provider is a one-line change. No need to touch the JSX. |
| `color`/`textColor` per provider | Google's brand guidelines require white background. GitHub is traditionally dark. These match user expectations. |
| `filter: brightness(0.95)` on hover | Gives a hover effect without fighting MUI's default `bgcolor` override on hover. |
| `"Create Account →"` closes modal | The `onClose` on this button closes the modal so Keycloak's standard `keycloak.register()` can be triggered from `HeaderActions` without nesting dialogs. |

---

### Step 4.3: Update `HeaderActions.tsx`

Wire `loginWithProvider` from `useAuth()` into the `LoginModal` component.

File: `apps/web/src/app/components/layout/HeaderActions.tsx`

Find the existing destructure of `useAuth()` and add `loginWithProvider`:

```tsx
// Before:
const { authenticated, user, logout, loginModalOpen, openLoginModal, closeLoginModal, loginWithCredentials } = useAuth();

// After:
const { authenticated, user, logout, loginModalOpen, openLoginModal, closeLoginModal, loginWithCredentials, loginWithProvider } = useAuth();
```

Then find the `<LoginModal>` usage and add the new prop:

```tsx
// Before:
<LoginModal
    open={loginModalOpen}
    onClose={closeLoginModal}
    onLogin={loginWithCredentials}
/>

// After:
<LoginModal
    open={loginModalOpen}
    onClose={closeLoginModal}
    onLogin={loginWithCredentials}
    onLoginWithProvider={loginWithProvider}
/>
```

No other changes are needed in this file.

---

### Step 4.4: Update the Unit Test Mock

The unit tests for `App` mock `useAuth()`. Since we added a new function to the context, the mock needs to be updated too or TypeScript will complain.

File: `apps/web/src/app/app.spec.tsx`

Find the `useAuth` mock return value and add `loginWithProvider`:

```tsx
jest.mock('./context/auth-context', () => ({
    useAuth: () => ({
        authenticated: false,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        loginWithCredentials: jest.fn(),
        loginWithProvider: jest.fn(),       // ← ADD THIS
        loginModalOpen: false,
        openLoginModal: jest.fn(),
        closeLoginModal: jest.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

---

## 5. Deep Dive: Code Keyword Breakdown

### 5.1 `idpHint` — The Express Lane

When you call `keycloak.login()` without any options, Keycloak shows its own login page where the user can choose any method (password, Google, GitHub, etc.). The `idpHint` option skips that page entirely and sends the user directly to the specified provider's login screen.

```
keycloak.login()                          → Keycloak login page (user chooses)
keycloak.login({ idpHint: 'google' })     → Straight to Google
keycloak.login({ idpHint: 'github' })     → Straight to GitHub
```

This is why your social buttons in the modal are better UX than relying on Keycloak's own login page — you're building a branded experience while Keycloak does the heavy lifting.

### 5.2 `SocialProvider` as a Union Type

```typescript
export type SocialProvider = 'google' | 'github' | 'facebook';
```

This is a **union type** — a TypeScript value that can be exactly one of the listed strings. It means:
- ✅ `loginWithProvider('google')` — compiles
- ✅ `loginWithProvider('github')` — compiles
- ❌ `loginWithProvider('twitter')` — TypeScript error: not in the union
- ❌ `loginWithProvider('gogle')` — TypeScript error: catches the typo

We `export` this type from `auth-context.tsx` so that `LoginModal.tsx` can import and reuse it for its own prop type — they stay in sync automatically.

### 5.3 The `SOCIAL_PROVIDERS` Config Array Pattern

```typescript
const SOCIAL_PROVIDERS: { id: SocialProvider; label: string; color: string; textColor: string }[] = [
    { id: 'google', label: 'Continue with Google', color: '#fff', textColor: '#3c4043' },
    { id: 'github', label: 'Continue with GitHub', color: '#24292e', textColor: '#fff' },
];
```

This pattern is called a **data-driven component**. Instead of writing JSX like this:

```tsx
<Button onClick={() => onLoginWithProvider('google')}>Continue with Google</Button>
<Button onClick={() => onLoginWithProvider('github')}>Continue with GitHub</Button>
```

We describe what to render as data and let `.map()` generate the JSX. The benefits:
- Adding a new provider = adding one object to the array
- No risk of copy-paste bugs in onClick handlers
- The array can later be moved to a config file or driven by which providers are enabled in Keycloak

### 5.4 Why `keycloak.login()` Returns a Promise

`keycloak.login({ idpHint: 'google' })` triggers a browser navigation — the user is literally redirected away from your React app. The Promise returned is only relevant if the redirect fails (e.g., a network error or Keycloak is unreachable). That's why we `.catch()` the error and log it, but we don't need a loading state or success handler — the user will already be gone.

---

## 6. Verification & Learning Check

### 6.1 Verify Step by Step

Run the web app:
```bash
npx nx serve web
```

| Check | Expected Result |
|---|---|
| Login modal opens | Click "Sign In" in the header |
| Social buttons appear | "Continue with Google" and "Continue with GitHub" are visible above the `or` divider |
| Username/password form still works | Fill in credentials and click Sign In |
| Google button redirects | Clicking "Continue with Google" redirects to Google's OAuth page |
| After Google auth, user is logged in | Header shows user's first name, dropdown menu appears |
| Create Account link appears | "New here? Create Account →" is visible at the bottom of the modal |

### 6.2 The Checklist

- [ ] `SocialProvider` type exported from `auth-context.tsx`
- [ ] `loginWithProvider` function added to `AuthContextType` interface
- [ ] `loginWithProvider` implementation calls `keycloak.login({ idpHint: provider })`
- [ ] `loginWithProvider` exposed in `AuthContext.Provider` value
- [ ] `SOCIAL_PROVIDERS` array in `LoginModal.tsx` maps to buttons
- [ ] `onLoginWithProvider` prop added to `LoginModalProps` interface
- [ ] `LoginModal` receives `onLoginWithProvider={loginWithProvider}` in `HeaderActions.tsx`
- [ ] Unit test mock in `app.spec.tsx` updated to include `loginWithProvider: jest.fn()`
- [ ] Google Identity Provider configured in Keycloak Admin Console
- [ ] Google OAuth credentials (Client ID + Secret) added to Keycloak

### 6.3 Testing That It Actually Logs In

1. Click "Sign In" in the header
2. Click "Continue with Google"
3. You should be redirected to `accounts.google.com`
4. Log in with your Google account
5. Google redirects back to `http://localhost:8080/realms/sdas-realm/broker/google/endpoint`
6. Keycloak processes the response and redirects back to `http://localhost:4200`
7. The header should now show your first name from your Google profile

---

## 7. Production Considerations

When moving from `localhost` to production, you will need to update two places:

### 7.1 Update the Redirect URI in Google Cloud Console

Change:
```
http://localhost:8080/realms/sdas-realm/broker/google/endpoint
```
To:
```
https://your-keycloak-domain.com/realms/sdas-realm/broker/google/endpoint
```

### 7.2 Update Keycloak's `Frontend URL`

In Keycloak Admin → Realm Settings → General → **Frontend URL**, set this to your production Keycloak URL. Keycloak uses this to build the redirect URIs it sends to Google.

---

## 8. What We Learned

| Concept | Applied Where |
|---|---|
| Keycloak Identity Brokering | Configured Google/GitHub as IdPs in Keycloak Admin |
| `idpHint` | `loginWithProvider()` in `auth-context.tsx` |
| Union types (`SocialProvider`) | Type-safe social provider names shared between context and modal |
| Data-driven components | `SOCIAL_PROVIDERS` array drives button rendering in `LoginModal` |
| MUI `Divider` with text | Visual `or` separator between social and password sections |
| Single Responsibility | `auth-context.tsx` handles auth logic, `LoginModal` handles UI only |
| Promise error handling | `.catch()` on `keycloak.login()` since redirect never returns |

---

## 9. Next Steps

With social login in place, the natural next steps are:

1. **Account Linking UI**: Show the user which social accounts are linked to their profile (Keycloak's Account Console provides this out of the box at `/realms/sdas-realm/account`)
2. **Profile data mapping**: Ensure the user's Google profile photo URL is captured from Keycloak's token claims
3. **Registration flow enhancement**: Add a "Create Account" button in `HeaderActions` that calls `keycloak.register()` for users who prefer to create a traditional username/password account
