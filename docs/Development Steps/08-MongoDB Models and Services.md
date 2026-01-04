# Step 08: MongoDB Models and Services

## 1. The "Why" Behind This Step: The Flexible Catalog

While PostgreSQL is our "Sovereign Vault" for critical transactional data, it is often too rigid for a modern **Product Catalog**.

**The Analogy**: Imagine a "Loose-Leaf Notebook."
- In a structured notebook (PostgreSQL), every page must have exactly the same lines and margins.
- In a loose-leaf notebook (MongoDB), you can have one page that is a drawing, one page that is a spreadsheet, and one page that is a handwritten letter. 
- In e-commerce, a "Scented Candle" has fragrance notes, but a "Wooden Sign" has dimensions. MongoDB lets them live in the same "Folder" (Collection) without forcing them to look identical.

---

## 2. Core Concepts & Definitions

#### 2.1 NoSQL (Not Only SQL)

- **Definition**: A type of database that stores data in flexible formats. MongoDB stores data as **BSON** (Binary JSON), which looks exactly like the JavaScript objects we use in our code.

#### 2.2 ODM (Object-Document Mapper) - Mongoose

- **Definition**: Even though MongoDB is flexible, we still want some "Sanity" in our code. Mongoose allows us to define a **Schema** that validates our data before it's saved.

#### 2.3 The JavaScript Promise (The IOU)

- **Definition**: A **Promise** is an object representing the eventual completion of a task.
- **The Analogy**: Ordering a Pizza.
    1.  You place the order (**Function Call**).
    2.  The shop gives you a receipt (**The Promise**).
    3.  You wait (**`await`**) for the pizza to be cooked.
    4.  Once it's done, you have your data (**Resolved Pizza**).

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
  name!: string;

  @Prop()
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  category!: string;

  @Prop({ type: Object })
  attributes!: Record<string, unknown>;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ProductSchema =
  SchemaFactory.createForClass(Product);
```

### Step 3.2: Create the Products Service

The Service is the "Brain" that talks to MongoDB. Create `apps/api/src/modules/products/products.service.ts`.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) 
    private productModel: Model<Product>
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }

  async create(productData: Partial<Product>): Promise<Product> {
    const newProduct = new this.productModel(productData);
    return newProduct.save();
  }
}
```

### Step 3.3: Register in the Products Module

Update `apps/api/src/modules/products/products.module.ts`.

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 Inherited Methods (`find`, `findById`, `save`)

- **The Source**: These methods come from the Mongoose `Model` class. We didn't have to write them! 
- **The Logic**: By injecting `Model<Product>`, NestJS gives us a tool that already knows how to perform all basic database operations.

#### 4.2 `Partial<T>` (The Flexible Type)

- **The Logic**: When you create a product, you don't have an `_id` yet (the database makes it). `Partial<Product>` tells TypeScript: "This object is *like* a product, but it's okay if some fields are missing for now."

#### 4.3 `.exec()`

- **The Logic**: Mongoose queries aren't "True" Promises by default. Calling `.exec()` ensures they become real Promises, which makes our `async/await` code much more reliable and easier to debug.

---

## 5. Verification & Learning Check

### 5.1 The Collection Check (MongoDB Compass)

1.  **Open MongoDB Compass**.
2.  **Connect**: Use your `.env.local` connection string.
3.  **Navigate**: Look for the `sdas_catalog` database and the `products` collection.

- **The Lesson**: MongoDB is "Lazy." The collection might not appear until you save your very first product. This is perfectly normal!

### 6. Checklist for Success

- [ ] **Terminology**: Do you know the difference between a "Table" (SQL) and a "Collection" (NoSQL)?
- [ ] **Inheritance**: Do you understand where `.find()` and `.save()` come from?
- [ ] **Promises**: Can you explain the "Pizza Analogy"?

**Moving Forward**: We have two separate databases working! Now we need the "Glue" that connects them: the logic for a shopping cart and the final checkout process. We'll build the **Cart and Checkout Services** next.
