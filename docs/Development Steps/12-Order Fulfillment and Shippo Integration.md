# Step 12: Order Fulfillment and Shippo Integration

## 1. The "Why" Behind This Step: The Physical Handshake

Your e-commerce site is a digital bridge. The customer pays online (Digital), but they expect a package at their door (Physical). 

**The Problem**: Calculating shipping rates, printing labels, and tracking packages is incredibly complex. Every carrier (UPS, FedEx, USPS) has a different system.

**The Solution**: We integrate with **Shippo**.
- **The Analogy**: Imagine Shippo as a "Universal Shipping Desk." 
    - Instead of you driving to 5 different post offices to compare prices, you bring your package to one desk (the Shippo API). 
    - You say "Here is where it's going." 
    - They give you the best rates from every carrier and print the label for you instantly.

---

## 2. Core Concepts & Definitions

#### 2.1 Webhooks

- **Definition**: A "Phone Call" from an external server to your server.
- **The Logic**: When a package is delivered, Shippo doesn't wait for you to ask. It "Calls" your API (via a Webhook) to say: "Hey, the package was delivered!" Your system then updates the order status automatically.

#### 2.2 Shipping Labels (The Passport)

- **Definition**: A digital file (PDF or image) that contains the barcode and address for the carrier.
- **The Logic**: Shippo returns a URL to a label. We save this URL in our PostgreSQL database so the worker can print it from the Admin Page.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Shippo Library

```bash
npm install shippo
```

### Step 3.2: Create the Shipping Service

Create `apps/api/src/modules/orders/shipping.service.ts`. This service will act as our "Post Office Clerk."

First, ensure you have added your warehouse address to your `.env.local` file:

```text
# Warehouse Address (Shippo address_from)
WAREHOUSE_NAME="Sawdust and Scents Warehouse"
WAREHOUSE_STREET="123 Woodworker Lane"
WAREHOUSE_CITY="Scentsville"
WAREHOUSE_STATE="CA"
WAREHOUSE_ZIP="90210"
WAREHOUSE_COUNTRY="US"
WAREHOUSE_PHONE="555-0123"
```

Now, implement the service using the **Shippo v2.x SDK**. 

**Important Note on Imports**: Ensure you use the standard TypeScript import `import { Shippo } from 'shippo';`. Using `require('shippo')` can lead to `TypeError: Shippo is not a function` in this environment.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Shippo } from 'shippo';

@Injectable()
export class ShippingService {
  private shippoClient: any;
  private warehouseAddress: any;

  constructor(private config: ConfigService) {
    // Correctly initialize the Shippo client for version 2.x
    this.shippoClient = new Shippo({
      apiKeyHeader: this.config.get('SHIPPO_API_KEY') as string,
    });

    this.warehouseAddress = {
      name: this.config.get('WAREHOUSE_NAME'),
      street1: this.config.get('WAREHOUSE_STREET'),
      city: this.config.get('WAREHOUSE_CITY'),
      state: this.config.get('WAREHOUSE_STATE'),
      zip: this.config.get('WAREHOUSE_ZIP'),
      country: this.config.get('WAREHOUSE_COUNTRY'),
      phone: this.config.get('WAREHOUSE_PHONE'),
    };
  }

  async createShipment(orderData: any) {
    // 1. Build the shipping address from the order
    const addressTo = {
      name: orderData.shippingName || 'Customer',
      street1: orderData.shippingStreet1 || '123 Main St',
      city: orderData.shippingCity || 'Anytown',
      state: orderData.shippingState || 'CA',
      zip: orderData.shippingZip || '90210',
      country: orderData.shippingCountry || 'US',
      phone: orderData.shippingPhone || '555-0000',
    };

    // 2. Send order details to Shippo
    const shipment = await this.shippoClient.shipments.create({
      addressFrom: this.warehouseAddress,
      addressTo,
      parcels: [
        {
          length: '10',
          width: '10',
          height: '10',
          distanceUnit: 'in',
          weight: '2',
          massUnit: 'lb',
        },
      ],
    });

    // 3. Return the rates found for this shipment
    return shipment.rates;
  }

  async purchaseLabel(rateId: string) {
    // 3. Buy the shipping label for the chosen rate
    return this.shippoClient.transactions.create({
      rate: rateId,
      labelFileType: 'PDF',
      async: false,
    });
  }

  async getTrackingStatus(carrier: string, trackingNumber: string) {
    // 4. Ask Shippo for the current location of the package
    return this.shippoClient.trackingStatus.get(trackingNumber, carrier);
  }
}
```

### Step 3.3: Add Shipping Address Fields to Order Entity

Update `apps/api/src/modules/orders/entities/order.entity.ts` to include shipping address fields:

```typescript
import {
    Entity,
    Column,
    Generated,
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
        cascade: true
    })
    items!: OrderItem[];

    @Column()
    @Generated('increment')
    orderNumber!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2})
    totalAmount!: number;

    @Column({ default: 'pending' })
    status!: string;

    @Column({ nullable: true })
    trackingNumber?: string;

    @Column({ nullable: true })
    shippingLabelUrl?: string;

    // Shipping Address fields
    @Column({ nullable: true })
    shippingName?: string;

    @Column({ nullable: true })
    shippingStreet1?: string;

    @Column({ nullable: true })
    shippingCity?: string;

    @Column({ nullable: true })
    shippingState?: string;

    @Column({ nullable: true })
    shippingZip?: string;

    @Column({ nullable: true, default: 'US' })
    shippingCountry?: string;

    @Column({ nullable: true })
    shippingPhone?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
```

**Why These Fields Matter**: In production, these fields would be populated when a customer completes checkout. For now, we use fallback values in the `ShippingService` so we can test the Shippo integration without actual customer data.

### Step 3.4: Register the Service in the Orders Module

Update `apps/api/src/modules/orders/orders.module.ts` to include the `ShippingService`.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrdersController],
  providers: [OrdersService, ShippingService],
  exports: [OrdersService, ShippingService, TypeOrmModule],
})
export class OrdersModule {}
```

### Step 3.5: Update the Orders Controller (The Workflow)

Now that our "Post Office Clerk" (the Service) is ready, we need to create the "Counter" (the Controller) where the worker can perform these actions. 

We will add two endpoints to the `OrdersController`:
1.  **GET `/:id/rates`**: To see how much shipping will cost.
2.  **POST `/:id/label`**: To actually buy the label and save the tracking info to our database.

Update `apps/api/src/modules/orders/orders.controller.ts`:

```typescript
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { Roles } from 'nest-keycloak-connect';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService
  ) {}

  // ... existing checkout/find methods ...

  @Get(':id/rates')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  async getRates(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return this.shippingService.createShipment(order);
  }

  @Post(':id/label')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  async purchaseLabel(
    @Param('id') id: string,
    @Body('rateId') rateId: string
  ) {
    // 1. Buy the label from Shippo
    const transaction = await this.shippingService.purchaseLabel(rateId);

    // 2. Update our database with tracking info and label URL
    await this.ordersService.update(id, {
      trackingNumber: transaction.tracking_number,
      shippingLabelUrl: transaction.label_url,
      status: 'Shipped'
    });

    return transaction;
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `address_from` / `address_to`

- **The Logic**: Shippo requires exact addresses to calculate taxes and distance. We pull the `address_to` from the Order record we created in Step 07.

#### 4.2 `parcels`

- **The Logic**: In e-commerce, size matters! Shipping cost is determined by weight and volume. For "Sawdust and Scents," we'll need to calculate if we are shipping a small candle or a heavy wooden sign.

#### 4.3 `track.get_status` (The Customer Experience)

- **The Logic**: This is how we give users "Peace of Mind." Shippo acts as a translator for every carrier. Whether the package is with UPS or USPS, this one method returns a consistent "Current Status" (e.g., "In Transit", "Delivered") that we can show the user.

#### 4.4 `transaction.create`

- **The Logic**: In Shippo language, a "Transaction" is the act of actually buying the label. This will charge your Shippo account and generate the barcode.

---

## 5. Verification & Learning Check

### 5.1 Manual API Verification (Testing the Handshake)

Since we haven't built the Frontend Admin Dashboard yet, we will verify the shipping logic using `curl` commands in the terminal.

1.  **Get an Order ID**: First, list your orders to find a valid UUID:
    ```bash
    curl http://localhost:3000/api/orders
    ```

2.  **Get a JWT Token**: Since the rates endpoint is protected by Keycloak authentication, you need to obtain a JWT token with the `worker` or `admin` role:
    ```bash
    curl -X POST "http://localhost:8080/realms/sdas-realm/protocol/openid-connect/token" \
      -d "client_id=sdas-api" \
      -d "client_secret=CMi2UNaA2l7pGzDvKYwiQJ2CayZLvl0k" \
      -d "username=chris_worker" \
      -d "password=YOUR_PASSWORD" \
      -d "grant_type=password"
    ```
    *   **Note**: Extract only the `access_token` value from the JSON response for use in the next step.

3.  **Calculate Rates**: Use the Order ID and JWT token to get shipping prices from Shippo:
    ```bash
    curl -X GET "http://localhost:3000/api/orders/0381184f-8c5b-425c-add9-e71c67893e89/rates" \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
    ```
    *   **Verify**: You should see a list of prices (e.g., USPS Ground: $10.00, USPS Priority: $12.96, USPS Express: $57.65). This proves your API key is correct and the "Handshake" with Shippo is working.

4.  **Purchase a Label**: Pick a `rateId` from the results above and buy it:
    ```bash
    curl -X POST "http://localhost:3000/api/orders/YOUR_ORDER_ID/label" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
      -d '{"rateId": "rate_paste_the_id_here"}'
    ```
    *   **Verify**: You should receive a transaction object with a `tracking_number` and `label_url`. Check your PostgreSQL database; the order should now have these details saved.

### Step 6. Checklist for Success

- [ ] **API Key**: Is your `SHIPPO_API_KEY` in your `.env.local` file?
- [ ] **Service**: Did you create the `ShippingService`?
- [ ] **Separation of Concerns**: Does the workflow separate "Calculating Rates" (GET) from "Buying the Label" (POST)?
- [ ] **Persistence**: Does the `purchaseLabel` endpoint save the `trackingNumber` and `shippingLabelUrl` back to the PostgreSQL database?

**Moving Forward**: We can now ship products! But a business is more than just shipping—it's about people. We'll integrate **ADP** for HR and Payroll functions next.
