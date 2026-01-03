# Step 03: CI/CD Pipeline Setup

## 1. The "Why" Behind This Step: The Quality Gate

In a collaborative project, how do you guarantee that a change made by one developer doesn't break a feature built by another? You could ask everyone to run all tests manually before pushing, but humans are forgetful.

**Continuous Integration (CI)** is the automated process of building, linting, and testing your code every single time a change is proposed. It acts as a **Quality Gate**.

---

## 2. Core Concepts & Definitions

#### 2.1 Continuous Integration (CI)

CI is a development practice where developers integrate code into a shared repository frequently. Each integration is verified by an automated build and automated tests.

#### 2.2 GitHub Actions

GitHub Actions is a CI/CD platform that allows you to automate your build, test, and deployment pipeline.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the CI Configuration (`ci.yml`)

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

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `on: [push, pull_request]`

- **Definition**: The "Triggers" for your pipeline.
- **The Logic**: It tells GitHub: "Start this process whenever someone pushes code directly to the main branch, OR whenever someone opens a Pull Request to merge their changes into the main branch."

#### 4.2 `runs-on: ubuntu-latest`

- **Definition**: The "Hardware" for your pipeline.
- **The Logic**: GitHub will spin up a fresh, empty computer running Linux (Ubuntu) to execute your tests. This ensures your code works in a clean environment, not just on your specific laptop.

#### 4.3 `fetch-depth: 0`

- **Definition**: A Git configuration.
- **The Logic**: Normally, GitHub only downloads the very latest commit to save time. However, Nx needs to compare your current code to the old code to see what changed. `fetch-depth: 0` downloads the **entire history**, allowing Nx to calculate exactly which projects were "affected."

#### 4.4 `npm ci`

- **Definition**: Clean Install.
- **The Logic**: In CI, we use `npm ci` instead of `npm install`. Why? Because `npm ci` is faster, stricter, and it **deletes** your old packages before installing fresh ones. This ensures your tests run in a perfect, predictable state.

#### 4.5 `nx affected -t <target>`

- **Definition**: The "Smart Build" command.
- **The Logic**: `-t` stands for **target** (like lint, test, or build). This command is the secret to scaling a large project—it only runs tests on the code that actually changed, saving you hours of waiting for CI to finish.

---

## 5. Verification & Learning Check

### 5.1 Local Simulation

You can test your CI pipeline without even pushing to GitHub:

```bash
npx nx graph --affected
```

**The Lesson**: If you haven't changed any files since your last commit, the graph will be empty. This visibility is crucial for understanding the impact of your changes.

### 6. Checklist for Success

- [ ] **Directory**: Does the `.github/workflows/` folder exist?
- [ ] **Workflow**: Is `ci.yml` correctly formatted?
- [ ] **Nx Config**: Is `fetch-depth: 0` included?

**Moving Forward**: Now that our infrastructure and safety nets are in place, it's time to write our first piece of actual business logic. We'll start by building the **NestJS Application Foundation**.
