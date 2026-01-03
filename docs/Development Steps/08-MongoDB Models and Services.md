# Step 08: MongoDB Models and Services

## 1. The "Why" Behind This Step: The Power of NoSQL

While PostgreSQL is our "Record of Truth" for structured, transactional data (like Orders), it is often too rigid for a modern **Product Catalog**.

In an e-commerce store, different products have wildly different details. A "Custom Scented Candle" has `fragrance_notes`, `burn_time`, and `wax_type`. A "Hand-Carved Sign" has `wood_type`, `dimensions`, and `carving_style`.

**MongoDB (NoSQL)** allows us to store these products as flexible **Documents**. We can store any data we want inside a single product record without asking the database for permission first.

---

## 2. Core Concepts & Definitions

#### 2.1 NoSQL (Not Only SQL)

- **Definition**: A type of database that stores data in formats other than traditional tables. MongoDB stores data as **BSON** (Binary JSON), which looks exactly like the JavaScript objects we use in our code.

#### 2.2 ODM (Object-Document Mapper) - Mongoose

- **Definition**: Even though MongoDB is flexible, we still want some "Sanity" in our code. Mongoose allows us to define a **Schema** that validates our data before it's saved.

---

## 3. Step-by-Step Implementation

### Step 3.1: Define the Product Schema

Create `apps/api/src/modules/products/schemas/product.schema.ts`.

```typescript
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  category: string;

  @Prop({ type: Object })
  attributes: Record<string, unknown>;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema =
  SchemaFactory.createForClass(Product);
```

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Schema({ timestamps: true })`

- **Definition**: A class decorator from Mongoose.
- **The Logic**: It tells MongoDB: "When you save this document, automatically add a `createdAt` and `updatedAt` field." This is a life-saver for tracking when products were last modified.

#### 4.2 `@Prop()`

- **Definition**: A property decorator.
- **The Logic**: It defines the "Rules" for a specific field. For example, `@Prop({ required: true })` ensures that the database will reject any product that doesn't have a name.

#### 4.3 `SchemaFactory.createForClass(Product)`

- **Definition**: A utility function from NestJS.
- **The Logic**: Mongoose (the database library) doesn't understand TypeScript classes. This function "translates" your TypeScript class into a format (a Schema) that Mongoose can use to talk to the database.

#### 4.4 `InjectModel(Product.name)` (In the Service)

- **Definition**: A dependency injection decorator.
- **The Logic**: It tells NestJS: "Go to the database, find the connection for the 'Product' collection, and give it to me so I can run queries."

#### 4.5 `.exec()` (In the Service)

- **Definition**: A method used to execute a Mongoose query.
- **The Logic**: Mongoose queries (like `.find()`) return something called a "Query Object." By calling `.exec()`, you convert that query into a real JavaScript **Promise**. This is a best practice that ensures your `async/await` code works reliably.

---

## 5. Verification & Learning Check

### 5.1 The "Flex" Test

Start your API. Use a tool like Postman or your Swagger UI (`/docs`) to create a product with an `attributes` object.

- **The Lesson**: Look at MongoDB Compass. Notice that the product exists as a JSON-like document. You didn't have to define columns for every attribute. This is "Schema Flexibility" in action.

### 6. Checklist for Success

- [ ] **Schema**: Is `SchemaFactory.createForClass` used to export the schema?
- [ ] **Flexibility**: Is the `attributes` field defined as an `Object`?
- [ ] **Timestamps**: Are they enabled in the `@Schema` decorator?

**Moving Forward**: We have two separate databases working! Now we need the "Glue" that connects them: the logic for a shopping cart and the final checkout process. We'll build the **Cart and Checkout Services** next.
