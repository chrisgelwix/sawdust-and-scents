# Step 01: Initializing the Nx Workspace

## 1. The "Why" Behind This Step: Architectural Strategy

When starting a modern full-stack project, the first decision is architectural: how do we organize our code? Historically, developers used **Polyrepos** (separate repositories for frontend and backend). While this seems simple, it often leads to "dependency hell," where the frontend breaks because the backend changed an interface, and nobody noticed until runtime.

In this project, we use a **Monorepo** managed by **Nx**.

### 2. Core Concepts & Definitions

#### 2.1 The Monorepo

A **Monorepo** is a single repository containing multiple projects (applications and libraries).

#### 2.2 Nx (The Smart Build System)

Nx is a "Build System with a Brain." Unlike standard folder structures, Nx understands the relationships between projects.

---

## 3. Step-by-Step Implementation

### Step 3.1: Initialize the Nx Foundation

We start by transforming our empty directory into an Nx workspace.

```bash
# Install Nx CLI as a development dependency
npm install --save-dev nx@latest

# Initialize Nx in the current directory
npx nx init
```

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `npm install`

- **Definition**: The standard command for the Node Package Manager.
- **The Logic**: It downloads libraries from the internet (the npm registry) and stores them in your `node_modules` folder.

#### 4.2 `--save-dev`

- **Definition**: A flag that marks a package as a "Development Dependency."
- **The Logic**: Tools like Nx or ESLint are needed for **building** and **writing** code, but they aren't needed by the user when they visit your website. Marking them as "dev" keeps your production server small and fast.

#### 4.3 `npx`

- **Definition**: Node Package Runner.
- **The Logic**: Normally, to run a tool like Nx, you have to install it globally on your whole computer. `npx` allows you to run a tool _without_ installing it permanently. It downloads the latest version, runs it once, and then disappears.

#### 4.4 `nx init`

- **Definition**: The starting command for Nx.
- **The Logic**: It scans your current folder and creates the "brain" files (`nx.json`, `tsconfig.base.json`) that turn a regular folder into a smart monorepo.

#### 4.5 `generate` (In later steps)

- **Definition**: An Nx command to run a "Generator."
- **The Logic**: Instead of manually creating 10 different files for a new project, a generator does it for you in 1 second. It ensures that every project in your company follows the exact same folder structure and naming conventions.

---

## 5. Verification & Learning Check

### 5.1 The Graph Check

Run the following command:

```bash
npx nx graph
```

**The Lesson**: This opens a web browser showing your architecture. Right now, you see `api` and `web` as floating circles. In a monorepo, "Visibility is Power."

### 6. Checklist for Success

- [ ] **Workspace**: Do you see `nx.json` and a root `package.json`?
- [ ] **Apps**: Do `apps/api` and `apps/web` have files inside them?
- [ ] **Verification**: Did the graph open successfully?

**Moving Forward**: Now that our "house" has its foundation, we need "utilities" (databases and authentication). We'll set those up using Docker in the next step.
