# Step 03: CI/CD Pipeline Setup

## 1. The "Why" Behind This Step: The Quality Gate

In a collaborative project, how do you guarantee that a change made by one developer doesn't break a feature built by another? You could ask everyone to run all tests manually before pushing, but humans are forgetful.

**The Solution**: We use **Continuous Integration (CI)**.
- **The Analogy**: Imagine an "Automated Quality Inspector" on a factory assembly line. 
    - Every time a part (a piece of code) is added, the inspector automatically checks it for cracks (Linting), tests if it fits (Building), and makes sure it works (Testing). 
    - If the inspector finds a problem, the entire line stops until it is fixed. 

---

## 2. Core Concepts & Definitions

#### 2.1 Continuous Integration (CI)
CI is the practice of merging all developer working copies to a shared mainline several times a day. Each integration is verified by an automated build and tests.

#### 2.2 GitHub Actions (The Automation Engine)
GitHub Actions is a tool built into GitHub that allows you to automate tasks. You define these tasks in **YAML** files. When you "Push" your code to GitHub, the engine reads these files and performs the work on a virtual server in the cloud.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Folder Structure
GitHub Actions looks for files in a very specific folder. 
1. Create a folder named `.github` in your project root.
2. Inside `.github`, create a folder named `workflows`.

```text
.
└── .github/
    └── workflows/          <-- Where your automation scripts live
```

### Step 3.2: Create the CI Configuration (`ci.yml`)
Create a file at `.github/workflows/ci.yml`.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint Affected
        run: npx nx affected -t lint

      - name: Test Affected
        run: npx nx affected -t test

      - name: Build Affected
        run: npx nx affected -t build
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `fetch-depth: 0`
- **The Logic**: Normally, GitHub only downloads the very latest version of your code. However, Nx needs to compare your current code to the "Old" code to figure out what changed. `fetch-depth: 0` downloads your entire history so Nx can calculate the "Affected" graph accurately.

#### 4.2 `npm ci` (Clean Install)
- **The Logic**: In development, we use `npm install`. In CI, we use `npm ci`. 
- **The Difference**: `npm ci` is faster and more strict. If your `package-lock.json` file is missing or doesn't match your `package.json`, it will fail immediately. This ensures your tests run in a perfect, predictable state.

#### 4.3 `nx affected -t <target>`
- **The Logic**: This is the "Magic" of Nx. If you have 100 projects in your monorepo but you only changed 1 file in the API, `nx affected` will **only** run tests for the API. 

---

## 5. Verification & Learning Check

### 5.1 Local Simulation
You can see what the CI would do by running this locally:
```bash
npx nx graph --affected
```

- **The Lesson**: If you haven't changed any files since your last commit, the graph will be empty. If you change a file in the API, the circle for `api` will turn red, showing it is "Affected."

### 5.2 Checking the GitHub Actions UI
Once you push your code to GitHub:
1. Go to your repository on GitHub.
2. Click the **Actions** tab.
3. You should see a workflow named **CI** running. Click on it to see the live logs for linting, testing, and building.

### 6. Checklist for Success

- [ ] **Directory**: Is your file inside `.github/workflows/`?
- [ ] **Formatting**: Did you use exact indentation in your YAML?
- [ ] **Fetch Depth**: Is `fetch-depth: 0` included?
- [ ] **Verification**: Did you run `nx graph --affected` locally?

**Moving Forward**: Our safety net is built. Now it's time to build the actual application. We'll start with the **NestJS Application Foundation**.
