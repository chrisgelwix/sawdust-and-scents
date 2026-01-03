# Step 04b: Shared Types Library

## 1. The "Why" Behind This Step: The "Single Source of Truth"

In a full-stack application, the Backend (API) and the Frontend (Web) are two separate programs that need to communicate. Imagine the Backend sends a piece of data called `productId`, but the Frontend is looking for a field called `id`. The app will crash, and finding the bug will take hours.

A **Shared Types Library** solves this. It acts as the "Contract" or "Dictionary" that both the Backend and Frontend must follow. If the contract changes in one place, the entire system is updated instantly.

---

## 2. Core Concepts & Definitions

#### 2.1 DRY (Don't Repeat Yourself)

DRY is a fundamental principle of software development.

- **The Problem**: If you define a `User` interface in the API folder and _copy-paste_ it into the Web folder, you now have two versions of the truth. If you update one but forget the other, you have a bug.
- **The Solution**: Define it once in a shared library. Both apps "borrow" the same file.

#### 2.2 Compile-Time Safety

TypeScript is a "Static Typing" language.

- **Definition**: This means bugs are caught while you are typing (Compile-Time), not while the user is using the app (Runtime). By sharing types, TypeScript can "see" that your React component is trying to use a field that the NestJS API doesn't provide.

---

## 3. Step-by-Step Implementation

### Step 3.1: Generate the Shared Library

We use the `@nx/js:library` generator because this library will only contain TypeScript code, no UI components.

```bash
# Generate the library
npx nx generate @nx/js:library --directory=libs/shared/types --name=shared-types --bundler=tsc --tags="scope:shared,type:types" --no-interactive
```

### Step 3.2: Define the Core Models

Create a file at `libs/shared/types/src/lib/models.ts`. This is where our "Contract" lives.

```typescript
export interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. Deep Dive: Library Keyword Breakdown

#### 4.1 `--bundler=tsc`

- **Definition**: TSC stands for "TypeScript Compiler."
- **The Logic**: Since this library only contains interfaces and simple TypeScript, we don't need a heavy tool like Webpack or Vite to build it. Using the raw TypeScript compiler (`tsc`) keeps the build process incredibly fast.

#### 4.2 `Record<string, unknown>`

- **Definition**: A built-in TypeScript utility type.
- **The Logic**: This defines an object where the **Keys** are strings, but the **Values** are `unknown`. We use this for MongoDB attributes because we don't know what they are yet. `unknown` is safer than `any` because it forces the developer to check the data type before using it, preventing "Undefined is not a function" errors.

#### 4.3 `interface` vs `class`

- **Definition**: An `interface` defines only the "Shape" of data. A `class` defines both the "Shape" and the "Behavior" (methods).
- **The Logic**: For shared models, we use `interface` because they disappear when the code is compiled to JavaScript. This results in a smaller, faster application. Classes should be reserved for the Backend where you need logic inside the objects.

#### 4.4 `tags: ["scope:shared"]`

- **Definition**: An Nx configuration for **Module Boundaries**.
- **The Logic**: By tagging this library as `shared`, we can write a rule in our ESLint config that says: "Shared libraries can be used by anyone, but they cannot import code from the API." This prevents "Spaghetti Architecture" where everything is tangled together.

---

## 5. Verification & Learning Check

### 5.1 The "Autocomplete" Test

Go to `apps/api/src/main.ts` (or any file) and try to type:
`import { OrderStatus } from '@sdas/shared-types';`

- **The Lesson**: Notice that as you type `@sdas`, your IDE suggests the library. This proves the path alias is working.

### 6. Checklist for Success

- [ ] **Folder**: Does `libs/shared/types/` exist?
- [ ] **Alias**: Does `@sdas/shared-types` exist in `tsconfig.base.json`?
- [ ] **Safety**: Did you use `unknown` for flexible fields?

**Moving Forward**: Now that our apps have a shared language, we need a place to actually store that data permanently. We'll dive into **Database Integration** next.
