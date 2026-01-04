# Step 04b: Shared Types Library

## 1. The "Why" Behind This Step: The Shared Dictionary

One of the biggest pain points in full-stack development is "Syncing Data." 
- The Backend thinks a `Product` has a `price`.
- The Frontend thinks a `Product` has a `cost`.
- The code breaks, but you don't find out until a user clicks a button and nothing happens.

**The Solution**: We create a **Shared Library**.
- **The Analogy**: Imagine two people who speak different languages trying to build a house together.
    - If they both have their own private dictionaries, they will eventually use different words for "Brick."
    - If they share one single **Shared Dictionary** (the Library), it is physically impossible for them to disagree. If the dictionary says it's called `price`, both people MUST use that word, or the "Supervisor" (TypeScript) will stop them.

---

## 2. Core Concepts & Definitions

#### 2.1 DRY (Don't Repeat Yourself)

DRY is a fundamental principle of software engineering. By defining a `User` interface once in a shared library, we avoid writing it again in the API and again in the Web app. This means if we add a `phoneNumber` field, we only have to add it in **one place**.

#### 2.2 Compile-Time Safety

This is the "Superpower" of TypeScript. Because our Frontend and Backend share the same library, if you change a field name in the library, your code will **immediately turn red** in both the Frontend and the Backend. You catch the bug before you even run the app.

#### 2.3 Barrel Files (`index.ts`)

- **Definition**: A file that re-exports everything from a folder.
- **The Logic**: Instead of importing from 10 different files, other projects can just import from the library's root. It's like a "Table of Contents" for your library.

---

## 3. Step-by-Step Implementation

### Step 3.1: Generate the Library

Run the following Nx command to create a new folder for our types.

```bash
# --directory: Where to put the library
# --name: The internal name of the library
# --bundler: How the code is compiled (tsc is standard for TypeScript)
npx nx generate @nx/js:library \
  --directory=libs/shared/types \
  --name=shared-types \
  --bundler=tsc \
  --tags="scope:shared,type:types" \
  --no-interactive
```

### Step 3.2: Define your First Models

Create `libs/shared/types/src/lib/models.ts`. This is where our "Shared Dictionary" begins.

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
  attributes: Record<string, unknown>;
  isActive: boolean;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `interface`

- **Definition**: A "Contract" that describes what an object must look like.
- **The Logic**: An interface doesn't actually **do** anything at runtime; it is purely for TypeScript's "Quality Inspector" to check your work while you are typing.

#### 4.2 `enum` (Enumeration)

- **Definition**: A list of named constants.
- **The Logic**: Instead of using strings like `"paid"` or `"pending"` (which are easy to mistype as `"payed"`), you use `OrderStatus.PAID`. This ensures you can only ever use the valid values you've defined.

#### 4.3 `Record<string, unknown>`

- **Definition**: A flexible object type.
- **The Logic**: This says: "The keys will be strings, but the values can be anything (unknown)." We use this for our MongoDB attributes because we don't know exactly what extra data a product might have.

#### 4.4 `export`

- **The Logic**: By default, everything inside a file is private. The `export` keyword is like "Publicly Listing" your dictionary entries so other projects can see them.

---

## 5. Verification & Learning Check

### 5.1 The GPS Check

Open your `tsconfig.base.json` file in the root directory.

- **The Lesson**: Look for the `"paths"` section. You should see a new line:
  `"@sdas/shared-types": ["libs/shared/types/src/index.ts"]`
  This is the "GPS" that allows you to write `import { User } from '@sdas/shared-types'` from anywhere in the whole monorepo.

### 6. Checklist for Success

- [ ] **Alias**: Can you see the `@sdas/shared-types` path in `tsconfig.base.json`?
- [ ] **Interface**: Did you define the `User` and `Product` interfaces?
- [ ] **Enums**: Did you use an `enum` for `OrderStatus`?
- [ ] **Terminology**: Can you explain why a shared library is better than copying and pasting code?

**Moving Forward**: We have our shared language. Now it's time to connect our "Brain" to our "Memory." We'll integrate the **Databases** next.
