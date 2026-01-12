# Step 06b: Keycloak Manual Configuration

## 1. The "Why" Behind This Step: Setting up the Bouncer

In Step 02, we used Docker to start the Keycloak server. However, a fresh Keycloak server is like an **"Empty Hotel."** It has no rooms, no locks, and no guests. 

**The Goal**: We need to log into the Admin Console and manually build the "Security Infrastructure" for **Sawdust and Scents**.

---

## 2. Core Concepts & Definitions

#### 2.1 The Realm (The Kingdom)
- **Definition**: A Realm is a space where you manage users, roles, and applications.
- **The Concept**: Think of it as an independent "Kingdom." Users in the `sdas-realm` cannot see users in the `master` realm. This keeps your application's security totally isolated.

#### 2.2 The Client (The Door)
- **Definition**: An application that is allowed to ask Keycloak to authenticate a user.
- **The Concept**: Our **NestJS API** is a Client. It "talks" to Keycloak to verify tokens.

#### 2.3 Roles (The Wristbands)
- **The Concept**: Roles define what a user is allowed to do.
    - **worker**: Can manage inventory and process orders.
    - **admin**: Can do everything, including HR functions via ADP.
    - **manager**: Can view dashboard metrics and inventory alerts.

---

## 3. Step-by-Step Implementation

### Step 3.1: Log into the Admin Console
1.  Ensure your Docker containers are running (`docker-compose up -d`).
2.  Visit `http://localhost:8080` in your browser.
3.  Log in using the credentials from your `.env.local`:
    - **Username**: `sdas_admin`
    - **Password**: `sdas_admin`

### Step 3.2: Create the `sdas-realm`
1.  In the top-left dropdown (it currently says "Master"), click **Create Realm**.
2.  **Realm Name**: `sdas-realm`.
3.  Click **Create**.

### Step 3.3: Create the `sdas-api` Client
1.  In the left sidebar, click **Clients**.
2.  Click **Create client**.
3.  **Client ID**: `sdas-api`.
4.  **Capability Config**:
    - **Client Authentication**: Set to **ON** (this makes it a "Confidential" client).
    - **Authorization**: Set to **ON**.
    - **Authentication Flow**: Ensure **Standard Flow** and **Direct Access Grants** are checked (needed for the `curl` test).
5.  **Login Settings**:
    - **Valid Redirect URIs**: `*` (for development only).
    - **Web Origins**: `*` (for development only).
6.  Click **Save**.

### Step 3.4: Get your Client Secret
1.  After saving, click the **Credentials** tab for the `sdas-api` client.
2.  Copy the **Client Secret**.
3.  **Update your `.env.local`**: Paste this secret into `KEYCLOAK_CLIENT_SECRET`.

### Step 3.5: Define the Application Roles
1.  In the left sidebar, click **Realm Roles**.
2.  Click **Create role**.
3.  **Role Name**: `worker`. Click **Save**.
4.  Repeat for roles named `admin` and `manager`.

### Step 3.6: Create a Test Worker User
1.  Click **Users** -> **Create new user**.
2.  **Username**: `chris_worker`.
3.  Click **Create**.
4.  Click the **Credentials** tab -> **Set password**. 
    - Set a password and turn **Temporary** to **OFF**.
5.  Click the **Role Mapping** tab -> **Assign role**.
    - Select the `worker` role and click **Assign**.

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 "Confidential" Client
- **The Logic**: Because our NestJS API runs on a secure server, it is allowed to keep a "Secret." This secret is used to prove to Keycloak that the API is who it says it is.

#### 4.2 Realm Roles vs Client Roles
- **The Logic**: **Realm Roles** are global (like "citizen"). **Client Roles** are specific to one app (like "waiter" at one specific restaurant). We use Realm Roles here for simplicity as our monorepo expands.

---

## 5. Verification & Learning Check

### 5.1 The "Secret" Check
Open your `.env.local` file.
- **The Lesson**: Does the `KEYCLOAK_CLIENT_SECRET` match the string you found in the Credentials tab? If not, your API will get a "401 Unauthorized" when trying to talk to the bouncer.

### 6. Checklist for Success
- [ ] **Realm**: Created `sdas-realm`?
- [ ] **Client**: Created `sdas-api` with "Client Authentication" ON?
- [ ] **Secret**: Copied the secret to your `.env.local`?
- [ ] **Roles**: Created `worker`, `admin`, and `manager` roles?
- [ ] **User**: Created a user and assigned them the `worker` role?

**Moving Forward**: Your security infrastructure is now physically built. You can now use the `curl` command to get your first token and test your API!



