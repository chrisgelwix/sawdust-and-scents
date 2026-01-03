# Step 07: PostgreSQL Models and Services

## 1. The "Why" Behind This Step: Structuring Business Logic

We have reached the "Soul" of the application. In the previous steps, we built the "Plumbing" (Databases) and the "Security" (Keycloak). Now we are defining the **Domain Models**—the actual things our business cares about: **Users** and **Orders**.

We use **PostgreSQL** for this data because it is transactional. If a customer pays for an order, we cannot afford for that data to be "eventually" consistent or "flexible." It must be perfect, relational, and durable.

---

## 2. Core Concepts & Definitions

#### 2.1 Entities (The Blueprint)

In TypeORM, an **Entity** is a class that maps to a database table.

- **The Concept**: Instead of thinking in "Rows and Columns," you think in "Properties and Objects." The Entity is the "Single Source of Truth" for what an Order looks like.

#### 2.2 Relational Mapping

SQL databases excel at linking data. We use two main types of relationships:

- **One-to-Many (`OneToMany`)**: One User can place many Orders.
- **Many-to-One (`ManyToOne`)**: Many Orders can belong to one single User.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the User Entity

Create `apps/api/src/modules/users/entities/user.entity.ts`. 

**Note on `!`**: We use the `!` (Definite Assignment Assertion) because TypeScript's strict mode requires all properties to be initialized in the constructor. However, TypeORM injects these values automatically from the database.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  keycloakId!: string;

  @Column()
  email!: string;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @CreateDateColumn()
  createdAt!: Date;
}
```

### Step 3.2: Create the Order Entity

Create `apps/api/src/modules/orders/entities/order.entity.ts`.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.orders)
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items!: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ default: 'pending' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
```

### Step 3.3: Create the Order Item Entity

Orders are made of individual items. Create `apps/api/src/modules/orders/entities/order-item.entity.ts`.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;

  @Column()
  productId!: string; // Reference to MongoDB Product ID

  @Column()
  productName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column()
  quantity!: number;
}
```

### Step 3.4: Register Entities in the Users Module

For TypeORM to "see" these entities, they must be registered in their respective modules. Update `apps/api/src/modules/users/users.module.ts`.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
```

### Step 3.5: Register Entities in the Orders Module

Update `apps/api/src/modules/orders/orders.module.ts`.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Entity('orders')`

- **Definition**: A class decorator from TypeORM.
- **The Logic**: It tells the database: "Create a table called 'orders' based on the properties of this class."

#### 4.2 `@PrimaryGeneratedColumn('uuid')`

- **Definition**: Marks the primary unique key for the table.
- **The Logic**: By passing `'uuid'`, we tell PostgreSQL to automatically generate a long, random string. This is much safer than using simple numbers (1, 2, 3) because it prevents people from guessing order IDs.

#### 4.3 `@ManyToOne` / `@OneToMany`

- **Definition**: Decorators that define a **Relationship**.
- **The Logic**: These tell TypeORM how to connect tables. `ManyToOne` on the Order means many orders can point back to one User. `OneToMany` on the User means the user can have an array of many Orders.

#### 4.4 `forFeature([Entity])`

- **Definition**: A method used to register entities within a specific module.
- **The Logic**: While `forRoot` (in DatabaseModule) sets up the connection to the database, `forFeature` tells the specific module which tables it is allowed to manage.

#### 4.5 `cascade: true`

- **Definition**: A configuration for relationships.
- **The Logic**: When you save an Order, it usually has multiple Items. With `cascade: true`, you don't have to save each item individually. You just save the Order, and TypeORM will "Cascade" the save command to all the Items automatically.

---

## 5. Verification & Learning Check

### 5.1 The Table Check

1.  **Run the API**: `npx nx serve api`.
2.  **Open DBeaver**: Connect to your PostgreSQL container.
3.  **Refresh**: Right-click on the "Tables" folder and select **Refresh**.

- **The Lesson**: You will see that TypeORM has automatically generated the tables for you. This is the power of the ORM—it manages your schema for you.

### 6. Checklist for Success

- [ ] **UUID**: Is `PrimaryGeneratedColumn('uuid')` used for all IDs?
- [ ] **Strict Mode**: Did you use the `!` operator for all entity properties?
- [ ] **Registration**: Are all 3 entities registered in the `forFeature` arrays of their modules?
- [ ] **DBeaver**: Do you see the `users`, `orders`, and `order_items` tables?

**Moving Forward**: We have our "Transaction" storage ready. Now we need our flexible "Catalog" storage in MongoDB. We'll build the **MongoDB Models and Services** next.
