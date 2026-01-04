# Step 07: PostgreSQL Models and Services

## 1. The "Why" Behind This Step: The Sovereign Vault

We have reached the "Soul" of the application. In the previous steps, we built the "Plumbing" (Databases) and the "Security" (Keycloak). Now we are defining the **Domain Models**—the actual things our business cares about: **Users** and **Orders**.

We use **PostgreSQL** for this data because it is transactional. 
**The Analogy**: Imagine a bank vault. 
- You don't want your balance to be "mostly correct" or "flexible." 
- If you move $100 from Savings to Checking, it must happen in both places perfectly, or not at all.
- PostgreSQL provides this "ACID" (Atomicity, Consistency, Isolation, Durability) guarantee for our critical financial data.

---

## 2. Core Concepts & Definitions

#### 2.1 Entities (The Blueprint)

In TypeORM, an **Entity** is a class that maps to a database table.
- **The Concept**: Instead of thinking in "Rows and Columns," you think in "Properties and Objects." The Entity is the "Single Source of Truth" for what an Order looks like.

#### 2.2 Relational Mapping

SQL databases excel at linking data. We use two main types of relationships:
- **One-to-Many (`OneToMany`)**: One User can place many Orders.
- **Many-to-One (`ManyToOne`)**: Many Orders can belong to one single User.

#### 2.3 Repositories (The Clerk)

- **Definition**: A **Repository** is a special class provided by TypeORM that handles the "talking" to the database.
- **The Logic**: Instead of writing complex SQL queries like `SELECT * FROM users WHERE id = ...`, you just use a Repository and say `userRepo.findOne(id)`. It is the clerk that goes into the vault and gets what you need.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the User Entity

Create `apps/api/src/modules/users/entities/user.entity.ts`. 

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

Create `apps/api/src/modules/orders/entities/order-item.entity.ts`.

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

### Step 3.4: Create the Orders Service

Now we need a service to actually save orders. Create `apps/api/src/modules/orders/orders.service.ts`.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>
  ) {}

  async create(orderData: Partial<Order>): Promise<Order> {
    const newOrder = this.ordersRepository.create(orderData);
    return this.ordersRepository.save(newOrder);
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['items'],
    });
  }
}
```

### Step 3.5: Register Everything in the Modules

Update `apps/api/src/modules/users/users.module.ts`:
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

Update `apps/api/src/modules/orders/orders.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  providers: [OrdersService],
  exports: [OrdersService, TypeOrmModule],
})
export class OrdersModule {}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@PrimaryGeneratedColumn('uuid')`

- **The Logic**: UUIDs (Universally Unique Identifiers) are long, random strings. Unlike simple numbers (1, 2, 3), they are impossible to guess. This protects your users from people trying to "guess" order URLs.

#### 4.2 `relations: ['items']` (In the Service)

- **The Logic**: SQL databases are "Lazy" by default. If you ask for an Order, it won't give you the items unless you explicitly ask for them. Using `relations` tells TypeORM to perform a "JOIN" and get the items at the same time.

#### 4.3 `forFeature([Entity])`

- **The Logic**: This is how you "connect" your blueprints to your module. It makes the **Repository** for that entity available for injection into your services.

#### 4.4 `cascade: true`

- **The Logic**: When you save an Order, you don't want to manually save 10 individual Items. `cascade` tells TypeORM: "If I save the parent (Order), automatically save all the children (Items) too."

---

## 5. Verification & Learning Check

### 5.1 The Table Check

1.  **Run the API**: `npx nx serve api`.
2.  **Open DBeaver**: Refresh your Tables list.
3.  **The Result**: You should see `users`, `orders`, and `order_items` tables.

### 6. Checklist for Success

- [ ] **UUID**: Are your IDs secure random strings?
- [ ] **Cascade**: Will your items save automatically when the order is saved?
- [ ] **Services**: Did you create the `OrdersService` so the Cart can use it later?

**Moving Forward**: We have our "Transaction" storage ready. Now we need our flexible "Catalog" storage in MongoDB. We'll build the **MongoDB Models and Services** next.
